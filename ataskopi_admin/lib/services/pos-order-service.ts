import type { Prisma } from '@prisma/client';
import { db as prisma } from '@/lib/db';
import { generateOrderNumber } from '@/lib/services/order-number-service';
import { priceOrderItem } from '@/lib/services/order-pricing';
import { ServiceError } from '@/lib/services/service-error';
import type { PosOrderInput, PosPaymentInput } from '@/lib/validation/pos-schemas';

const MONEY_TOLERANCE = 0.01;
const SYNC_TX_OPTIONS = { timeout: 15000 };
const FINAL_STATUSES = ['completed', 'cancelled', 'rejected'];
const WALK_IN_PHONE = 'walk-in';

export interface PosContext {
    actorId: string;
    // Set for cashiers, who may only touch their own outlet.
    outletScope: string | null;
}

export interface PosSyncResult {
    clientOrderId: string;
    status: 'created' | 'updated' | 'duplicate' | 'rejected';
    orderId?: string;
    orderNumber?: string;
    error?: string;
}

type Tx = Prisma.TransactionClient;

function differs(a: number, b: number) {
    return Math.abs(a - b) > MONEY_TOLERANCE;
}

function assertOutletScope(outletId: string, ctx: PosContext) {
    if (ctx.outletScope && ctx.outletScope !== outletId) {
        throw new ServiceError('Order bukan milik outlet ini', 403);
    }
}

export function assertOrderTotals(input: PosOrderInput) {
    const itemsTotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    if (differs(itemsTotal, input.subtotal)) {
        throw new ServiceError('Subtotal tidak cocok dengan item');
    }
    if (differs(input.subtotal - input.discount + input.tax, input.total)) {
        throw new ServiceError('Total tidak cocok dengan subtotal, diskon, dan pajak');
    }
}

/**
 * Derives the order's payment fields from what was actually collected.
 */
export function summarizePayments(
    total: number,
    payments: { method: string; amount: unknown }[],
    refundedAmount: number
) {
    const paid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const methods = [...new Set(payments.map((payment) => payment.method))];

    let paymentStatus = 'pending';
    if (paid > 0 && refundedAmount >= paid - MONEY_TOLERANCE) {
        paymentStatus = 'refunded';
    } else if (paid >= total - MONEY_TOLERANCE) {
        paymentStatus = 'paid';
    }

    return {
        paymentStatus,
        paymentMethod: methods.length > 1 ? 'split' : (methods[0] ?? null),
    };
}

async function refreshPaymentState(tx: Tx, orderId: string, total: number) {
    const [payments, refunds] = await Promise.all([
        tx.orderPayment.findMany({ where: { orderId } }),
        tx.orderRefund.findMany({ where: { orderId } }),
    ]);
    const refunded = refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
    const summary = summarizePayments(total, payments, refunded);
    await tx.order.update({ where: { id: orderId }, data: summary });
    return summary;
}

async function resolveShiftId(tx: Tx, shiftRef: string, outletId: string) {
    const shift = await tx.shift.findFirst({
        where: { outletId, OR: [{ id: shiftRef }, { clientShiftId: shiftRef }] },
        select: { id: true },
    });
    if (!shift) throw new ServiceError('Shift tidak ditemukan');
    return shift.id;
}

async function addPayments(
    tx: Tx,
    orderId: string,
    shiftId: string | null,
    payments: PosPaymentInput[],
    actorId: string
) {
    if (payments.length === 0) return;
    await tx.orderPayment.createMany({
        data: payments.map((payment) => ({
            orderId,
            clientPaymentId: payment.clientPaymentId,
            method: payment.method,
            amount: payment.amount,
            tenderedAmount: payment.tenderedAmount,
            paidAt: payment.paidAt ? new Date(payment.paidAt) : undefined,
            cashierId: actorId,
            shiftId,
        })),
        skipDuplicates: true,
    });
}

async function writeItems(tx: Tx, orderId: string, input: PosOrderInput, outletId: string, actorId: string) {
    const products = await tx.product.findMany({
        where: { id: { in: input.items.map((item) => item.productId) } },
        include: {
            options: { include: { values: true } },
            modifiers: true,
            channelPrices: true,
        },
    });

    const mismatches: { productId: string; sold: number; catalog: number }[] = [];

    for (const item of input.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new ServiceError(`Produk ${item.productId} tidak ditemukan`);

        // The customer already paid the cashier's price, so a catalog change
        // made while offline is recorded rather than rejected.
        const priced = priceOrderItem(product, item, {
            channel: input.channel,
            allowUnavailableModifiers: true,
        });
        if (differs(priced.unitPrice, item.unitPrice)) {
            mismatches.push({ productId: product.id, sold: item.unitPrice, catalog: priced.unitPrice });
        }

        const orderItem = await tx.orderItem.create({
            data: {
                orderId,
                productId: product.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                notes: item.notes,
            },
        });

        if (item.selectedOptions.length > 0) {
            await tx.orderItemOption.createMany({
                data: item.selectedOptions.map((option) => ({
                    orderItemId: orderItem.id,
                    optionValueId: option.valueId,
                })),
            });
        }

        if (priced.modifiers.length > 0) {
            await tx.orderItemModifier.createMany({
                data: priced.modifiers.map((modifier) => ({ orderItemId: orderItem.id, ...modifier })),
            });
        }
    }

    if (mismatches.length > 0) {
        await tx.auditLog.create({
            data: {
                outletId,
                actorId,
                action: 'price_mismatch',
                entityType: 'order',
                entityId: orderId,
                details: { mismatches },
            },
        });
    }
}

async function resolveOrderOwner(tx: Tx, customerId?: string | null) {
    if (customerId) {
        const customer = await tx.user.findFirst({
            where: { id: customerId, role: 'customer' },
            select: { id: true },
        });
        if (!customer) throw new ServiceError('Member tidak ditemukan');
        return customer.id;
    }

    const walkIn = await tx.user.upsert({
        where: { phone: WALK_IN_PHONE },
        create: { phone: WALK_IN_PHONE, name: 'Walk-in', role: 'walk_in' },
        update: {},
    });
    return walkIn.id;
}

async function createOrder(input: PosOrderInput, outletId: string, actorId: string): Promise<PosSyncResult> {
    return prisma.$transaction(async (tx) => {
        const shiftId = await resolveShiftId(tx, input.shiftId, outletId);
        const userId = await resolveOrderOwner(tx, input.customerId);
        const orderNumber = await generateOrderNumber(tx, outletId);

        const order = await tx.order.create({
            data: {
                userId,
                outletId,
                orderNumber,
                orderType: input.orderType,
                tableId: input.tableId,
                guestName: input.guestName,
                notes: input.notes,
                source: 'pos',
                channel: input.channel,
                clientOrderId: input.clientOrderId,
                posRevision: input.revision,
                queueNumber: input.queueNumber,
                cashierId: actorId,
                shiftId,
                subtotal: input.subtotal,
                discount: input.discount,
                tax: input.tax,
                total: input.total,
                orderStatus: 'preparing',
                createdAt: new Date(input.createdAt),
            },
        });

        await writeItems(tx, order.id, input, outletId, actorId);
        await addPayments(tx, order.id, shiftId, input.payments, actorId);
        await refreshPaymentState(tx, order.id, input.total);

        if (input.discount > 0) {
            await tx.auditLog.create({
                data: {
                    outletId,
                    actorId,
                    action: 'discount',
                    entityType: 'order',
                    entityId: order.id,
                    details: { amount: input.discount },
                },
            });
        }

        return {
            clientOrderId: input.clientOrderId,
            status: 'created',
            orderId: order.id,
            orderNumber,
        };
    }, SYNC_TX_OPTIONS);
}

interface ExistingOrder {
    id: string;
    orderNumber: string;
    outletId: string;
    orderStatus: string;
    posRevision: number;
    total: unknown;
    shiftId: string | null;
}

async function updateOrder(input: PosOrderInput, existing: ExistingOrder, actorId: string): Promise<PosSyncResult> {
    const isNewerRevision = input.revision > existing.posRevision;
    if (isNewerRevision && FINAL_STATUSES.includes(existing.orderStatus)) {
        throw new ServiceError(`Order sudah ${existing.orderStatus}, tidak bisa diubah`, 409);
    }

    await prisma.$transaction(async (tx) => {
        if (isNewerRevision) {
            await tx.orderItemOption.deleteMany({ where: { orderItem: { orderId: existing.id } } });
            await tx.orderItemModifier.deleteMany({ where: { orderItem: { orderId: existing.id } } });
            await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
            await writeItems(tx, existing.id, input, existing.outletId, actorId);
            await tx.order.update({
                where: { id: existing.id },
                data: {
                    posRevision: input.revision,
                    guestName: input.guestName,
                    notes: input.notes,
                    subtotal: input.subtotal,
                    discount: input.discount,
                    tax: input.tax,
                    total: input.total,
                },
            });
        }

        await addPayments(tx, existing.id, existing.shiftId, input.payments, actorId);
        const total = isNewerRevision ? input.total : Number(existing.total);
        await refreshPaymentState(tx, existing.id, total);
    }, SYNC_TX_OPTIONS);

    return {
        clientOrderId: input.clientOrderId,
        status: isNewerRevision ? 'updated' : 'duplicate',
        orderId: existing.id,
        orderNumber: existing.orderNumber,
    };
}

function isUniqueViolation(error: unknown) {
    return (error as { code?: string })?.code === 'P2002';
}

async function findByClientOrderId(clientOrderId: string) {
    return prisma.order.findUnique({
        where: { clientOrderId },
        select: {
            id: true,
            orderNumber: true,
            outletId: true,
            orderStatus: true,
            posRevision: true,
            total: true,
            shiftId: true,
        },
    });
}

/**
 * Stores one order sent by the POS. Safe to call repeatedly with the same
 * payload, since the app retries whenever it does not see a response.
 */
export async function syncPosOrder(
    input: PosOrderInput,
    outletId: string,
    actorId: string
): Promise<PosSyncResult> {
    try {
        assertOrderTotals(input);

        const existing = await findByClientOrderId(input.clientOrderId);
        if (existing) {
            if (existing.outletId !== outletId) {
                throw new ServiceError('Order bukan milik outlet ini', 403);
            }
            return await updateOrder(input, existing, actorId);
        }

        return await createOrder(input, outletId, actorId);
    } catch (error) {
        if (isUniqueViolation(error)) {
            const winner = await findByClientOrderId(input.clientOrderId);
            if (winner) {
                return {
                    clientOrderId: input.clientOrderId,
                    status: 'duplicate',
                    orderId: winner.id,
                    orderNumber: winner.orderNumber,
                };
            }
        }
        if (error instanceof ServiceError) {
            return { clientOrderId: input.clientOrderId, status: 'rejected', error: error.message };
        }
        throw error;
    }
}

/**
 * Finds an order by server id or by the id the app generated offline, so
 * queued actions can run before the app has learned the server id.
 */
export async function findPosOrder(ref: string, ctx: PosContext) {
    const order = await prisma.order.findFirst({
        where: { OR: [{ id: ref }, { clientOrderId: ref }] },
        include: { payments: true, refunds: true },
    });
    if (!order) throw new ServiceError('Order not found', 404);
    assertOutletScope(order.outletId, ctx);
    return order;
}

/**
 * What was collected, including online orders marked paid on the web board,
 * which have no payment rows.
 */
export function collectedAmount(order: {
    paymentStatus: string;
    total: unknown;
    payments: { amount: unknown }[];
}) {
    if (order.payments.length === 0) {
        return order.paymentStatus === 'paid' ? Number(order.total) : 0;
    }
    return order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
}

export async function recordPosPayment(ref: string, payment: PosPaymentInput, ctx: PosContext) {
    const order = await findPosOrder(ref, ctx);

    if (order.payments.some((p) => p.clientPaymentId === payment.clientPaymentId)) {
        return { orderId: order.id, paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod };
    }
    if (order.voidedAt) throw new ServiceError('Order sudah di-void', 409);

    const total = Number(order.total);
    if (payment.amount > total - collectedAmount(order) + MONEY_TOLERANCE) {
        throw new ServiceError('Pembayaran melebihi sisa tagihan');
    }

    return prisma.$transaction(async (tx) => {
        const shiftId = payment.shiftId ? await resolveShiftId(tx, payment.shiftId, order.outletId) : null;
        await addPayments(tx, order.id, shiftId, [payment], ctx.actorId);
        const summary = await refreshPaymentState(tx, order.id, total);
        return { orderId: order.id, ...summary };
    });
}

export async function voidPosOrder(ref: string, reason: string, ctx: PosContext) {
    const order = await findPosOrder(ref, ctx);

    if (order.voidedAt) return { orderId: order.id, orderStatus: order.orderStatus };
    if (order.source !== 'pos') {
        throw new ServiceError('Order online ditolak lewat ubah status, bukan void', 409);
    }
    if (FINAL_STATUSES.includes(order.orderStatus)) {
        throw new ServiceError(`Order sudah ${order.orderStatus}`, 409);
    }
    if (collectedAmount(order) > 0) {
        throw new ServiceError('Order sudah dibayar, gunakan refund', 409);
    }

    await prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id: order.id },
            data: {
                orderStatus: 'cancelled',
                voidedAt: new Date(),
                voidedBy: ctx.actorId,
                voidReason: reason,
            },
        });
        await tx.auditLog.create({
            data: {
                outletId: order.outletId,
                actorId: ctx.actorId,
                action: 'void',
                entityType: 'order',
                entityId: order.id,
                details: { reason },
            },
        });
    });

    return { orderId: order.id, orderStatus: 'cancelled' };
}

interface RefundInput {
    clientRefundId: string;
    method: string;
    amount: number;
    reason: string;
    shiftId?: string;
}

export async function refundPosOrder(ref: string, input: RefundInput, ctx: PosContext) {
    const order = await findPosOrder(ref, ctx);

    if (order.refunds.some((r) => r.clientRefundId === input.clientRefundId)) {
        return { orderId: order.id, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus };
    }

    const collected = collectedAmount(order);
    const refunded = order.refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
    if (input.amount > collected - refunded + MONEY_TOLERANCE) {
        throw new ServiceError('Refund melebihi jumlah yang dibayar');
    }

    const isFullRefund = refunded + input.amount >= collected - MONEY_TOLERANCE;

    return prisma.$transaction(async (tx) => {
        const shiftId = input.shiftId ? await resolveShiftId(tx, input.shiftId, order.outletId) : null;

        await tx.orderRefund.create({
            data: {
                orderId: order.id,
                clientRefundId: input.clientRefundId,
                method: input.method,
                amount: input.amount,
                reason: input.reason,
                cashierId: ctx.actorId,
                shiftId,
            },
        });

        const orderStatus = isFullRefund ? 'cancelled' : order.orderStatus;
        const paymentStatus = isFullRefund ? 'refunded' : order.paymentStatus;
        await tx.order.update({ where: { id: order.id }, data: { orderStatus, paymentStatus } });

        await tx.auditLog.create({
            data: {
                outletId: order.outletId,
                actorId: ctx.actorId,
                action: 'refund',
                entityType: 'order',
                entityId: order.id,
                details: { amount: input.amount, method: input.method, reason: input.reason },
            },
        });

        return { orderId: order.id, paymentStatus, orderStatus };
    });
}
