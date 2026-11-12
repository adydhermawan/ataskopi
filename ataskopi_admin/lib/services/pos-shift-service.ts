import { db as prisma } from '@/lib/db';
import { ServiceError } from '@/lib/services/service-error';
import { invalidateProjectionCache } from '@/lib/cache/projection-cache';
import { addStockToMaterial, removeStockFromMaterial } from '@/lib/services/inventory-stock-service';
import type { PosContext } from '@/lib/services/pos-order-service';
import {
    businessDate,
    businessDayRange,
    cashExpensesForDate,
    cashExpensesListForDate,
    cashPurchasesForDate,
    cashPurchasesListForDate,
    paidInCashOn,
    suggestDailyCash,
    upsertDailyCash,
    type DailyCashInput,
    type DailyCashResult,
} from '@/lib/services/daily-cash-service';

interface MoneyRow {
    method?: string;
    type?: string;
    amount: unknown;
}

/**
 * Cash that should be in the drawer. QRIS and delivery platform payments never
 * touch it.
 */
export function calculateExpectedCash(
    openingCash: number,
    payments: MoneyRow[],
    refunds: MoneyRow[],
    movements: MoneyRow[]
) {
    const sum = (rows: MoneyRow[]) => rows.reduce((total, row) => total + Number(row.amount), 0);

    return (
        openingCash +
        sum(payments.filter((p) => p.method === 'cash')) -
        sum(refunds.filter((r) => r.method === 'cash')) +
        sum(movements.filter((m) => m.type === 'in')) -
        sum(movements.filter((m) => m.type === 'out'))
    );
}

function salesByMethod(payments: MoneyRow[]) {
    const totals: Record<string, number> = {};
    for (const payment of payments) {
        const method = payment.method ?? 'unknown';
        totals[method] = (totals[method] ?? 0) + Number(payment.amount);
    }
    return totals;
}

async function findShift(ref: string, ctx: PosContext) {
    const shift = await prisma.shift.findFirst({
        where: { OR: [{ id: ref }, { clientShiftId: ref }] },
        include: { payments: true, refunds: true, cashMovements: true },
    });
    if (!shift) throw new ServiceError('Shift tidak ditemukan', 404);
    if (ctx.outletScope && ctx.outletScope !== shift.outletId) {
        throw new ServiceError('Shift bukan milik outlet ini', 403);
    }
    return shift;
}

type LoadedShift = Awaited<ReturnType<typeof findShift>>;

function formatShift(shift: LoadedShift) {
    return {
        id: shift.id,
        clientShiftId: shift.clientShiftId,
        outletId: shift.outletId,
        cashierId: shift.cashierId,
        status: shift.status,
        openedAt: shift.openedAt.toISOString(),
        closedAt: shift.closedAt?.toISOString() ?? null,
        openingCash: Number(shift.openingCash),
        expectedCash:
            shift.expectedCash !== null
                ? Number(shift.expectedCash)
                : calculateExpectedCash(
                      Number(shift.openingCash),
                      shift.payments,
                      shift.refunds,
                      shift.cashMovements
                  ),
        actualCash: shift.actualCash !== null ? Number(shift.actualCash) : null,
        cashDifference: shift.cashDifference !== null ? Number(shift.cashDifference) : null,
        salesByMethod: salesByMethod(shift.payments),
    };
}

interface OpenShiftInput {
    outletId: string;
    clientShiftId: string;
    openingCash: number;
    openedAt?: string;
}

export async function openShift(input: OpenShiftInput, ctx: PosContext) {
    const repeated = await prisma.shift.findUnique({ where: { clientShiftId: input.clientShiftId } });
    if (repeated) return formatShift(await findShift(repeated.id, ctx));

    const alreadyOpen = await prisma.shift.findFirst({
        where: { outletId: input.outletId, status: 'open' },
        select: { id: true },
    });
    if (alreadyOpen) throw new ServiceError('Masih ada shift yang belum ditutup', 409);

    const shift = await prisma.shift.create({
        data: {
            outletId: input.outletId,
            clientShiftId: input.clientShiftId,
            cashierId: ctx.actorId,
            openingCash: input.openingCash,
            openedAt: input.openedAt ? new Date(input.openedAt) : undefined,
        },
    });
    return formatShift(await findShift(shift.id, ctx));
}

export async function getOpenShift(outletId: string, ctx: PosContext) {
    const shift = await prisma.shift.findFirst({
        where: { outletId, status: 'open' },
        select: { id: true },
    });
    return shift ? formatShift(await findShift(shift.id, ctx)) : null;
}

interface CashMovementInput {
    clientMovementId: string;
    type: string;
    amount: number;
    reason: string;
}

export async function addCashMovement(ref: string, input: CashMovementInput, ctx: PosContext) {
    const shift = await findShift(ref, ctx);

    if (!shift.cashMovements.some((m) => m.clientMovementId === input.clientMovementId)) {
        if (shift.status !== 'open') throw new ServiceError('Shift sudah ditutup', 409);

        await prisma.shiftCashMovement.create({
            data: { shiftId: shift.id, cashierId: ctx.actorId, ...input },
        });
    }

    return formatShift(await findShift(shift.id, ctx));
}

/**
 * Takings per method for a whole day: what was collected minus what was
 * refunded, across every shift opened that day, plus app orders paid in the
 * app, which never pass the cashier.
 */
export function daySalesByMethod(
    shifts: { payments: MoneyRow[]; refunds: MoneyRow[] }[],
    appOrders: { paymentMethod: string | null; total: unknown }[]
) {
    const totals: Record<string, number> = {};
    const add = (method: string, amount: number) => {
        totals[method] = (totals[method] ?? 0) + amount;
    };

    for (const shift of shifts) {
        for (const payment of shift.payments) add(payment.method ?? 'unknown', Number(payment.amount));
        for (const refund of shift.refunds) add(refund.method ?? 'unknown', -Number(refund.amount));
    }
    for (const order of appOrders) {
        add((order.paymentMethod ?? 'app').toLowerCase(), Number(order.total));
    }
    return totals;
}

/**
 * Everything the closing form needs: the drawer of this shift, and the day's
 * figures for the daily cash record.
 */
export async function getClosingSummary(ref: string, ctx: PosContext) {
    const shift = await findShift(ref, ctx);
    const date = businessDate(shift.openedAt);
    const { start, end } = businessDayRange(date);

    const [dayShifts, appOrders, cashPurchases, cashExpenses, existing, purchases, expenses, rawMaterials] =
        await Promise.all([
        prisma.shift.findMany({
            where: { outletId: shift.outletId, openedAt: { gte: start, lt: end } },
            select: { payments: true, refunds: true },
        }),
        prisma.order.findMany({
            where: {
                outletId: shift.outletId,
                source: { not: 'pos' },
                createdAt: { gte: start, lt: end },
                paymentStatus: 'paid',
                orderStatus: { notIn: ['cancelled', 'rejected'] },
                payments: { none: {} },
            },
            select: { paymentMethod: true, total: true },
        }),
        cashPurchasesForDate(shift.outletId, date),
        cashExpensesForDate(shift.outletId, date),
        prisma.dailyRealRevenue.findUnique({
            where: { date_outletId: { date: new Date(`${date}T00:00:00Z`), outletId: shift.outletId } },
        }),
        cashPurchasesListForDate(shift.outletId, date),
        cashExpensesListForDate(shift.outletId, date),
        prisma.rawMaterial.findMany({
            where: { outletId: shift.outletId },
            select: { id: true, name: true, unit: true, averageCost: true },
            orderBy: { name: 'asc' },
        }),
    ]);

    const daySales = daySalesByMethod(dayShifts, appOrders);
    const movementTotal = (type: string) =>
        shift.cashMovements.filter((m) => m.type === type).reduce((sum, m) => sum + Number(m.amount), 0);

    return {
        shift: formatShift(shift),
        date,
        cashIn: movementTotal('in'),
        cashOut: movementTotal('out'),
        daySales,
        cashPurchases,
        cashExpenses,
        purchases,
        expenses,
        rawMaterials: rawMaterials.map((m) => ({ ...m, averageCost: Number(m.averageCost) })),
        suggested: suggestDailyCash(daySales, cashPurchases, cashExpenses),
        existing: existing && {
            cashAmount: Number(existing.cashAmount),
            qrisAmount: Number(existing.qrisAmount),
            otherAmount: Number(existing.otherAmount),
            otherMethodName: existing.otherMethodName,
            notes: existing.notes,
            isClosed: existing.isClosed,
        },
    };
}

interface CloseShiftInput {
    actualCash: number;
    closedAt?: string;
    notes?: string | null;
    dailyCash?: DailyCashInput;
}

/**
 * Closes the drawer and, when the form came along, writes the day's cash
 * record in the same step. Repeating it after a lost reply is harmless.
 */
export async function closeShift(ref: string, input: CloseShiftInput, ctx: PosContext) {
    const shift = await findShift(ref, ctx);

    const expectedCash = calculateExpectedCash(
        Number(shift.openingCash),
        shift.payments,
        shift.refunds,
        shift.cashMovements
    );

    const dailyCash = await prisma.$transaction(async (tx) => {
        if (shift.status !== 'closed') {
            await tx.shift.update({
                where: { id: shift.id },
                data: {
                    status: 'closed',
                    closedAt: input.closedAt ? new Date(input.closedAt) : new Date(),
                    expectedCash,
                    actualCash: input.actualCash,
                    cashDifference: input.actualCash - expectedCash,
                    notes: input.notes,
                },
            });
        }

        if (!input.dailyCash) return null;
        return upsertDailyCash(tx, shift.outletId, businessDate(shift.openedAt), input.dailyCash);
    });

    return { ...formatShift(await findShift(shift.id, ctx)), dailyCash: dailyCash satisfies DailyCashResult | null };
}

/** Shopping and expenses are only changed while the shift is open. */
async function openShiftDay(ref: string, ctx: PosContext) {
    const shift = await findShift(ref, ctx);
    if (shift.status !== 'open') throw new ServiceError('Shift sudah ditutup', 409);
    return { shift, date: businessDate(shift.openedAt) };
}

interface ShiftPurchaseInput {
    rawMaterialId: string;
    quantity: number;
    unitPrice?: number;
    totalAmount: number;
    supplier?: string | null;
    notes?: string | null;
}

/**
 * Raw material bought with drawer cash. Recorded like the admin's daily cash
 * form does: paid in cash, received, and added to stock at once.
 */
export async function addShiftPurchase(ref: string, input: ShiftPurchaseInput, ctx: PosContext) {
    const { shift, date } = await openShiftDay(ref, ctx);
    const material = await prisma.rawMaterial.findFirst({
        where: { id: input.rawMaterialId, outletId: shift.outletId },
        select: { id: true },
    });
    if (!material) throw new ServiceError('Bahan baku tidak ditemukan di outlet ini', 404);

    const unitPrice = input.unitPrice && input.unitPrice > 0 ? input.unitPrice : input.totalAmount / input.quantity;
    const now = new Date();
    await prisma.$transaction(async (tx) => {
        await tx.inventoryPurchase.create({
            data: {
                outletId: shift.outletId,
                rawMaterialId: input.rawMaterialId,
                date: new Date(`${date}T00:00:00Z`),
                quantity: input.quantity.toFixed(2),
                unitPrice: unitPrice.toFixed(2),
                totalAmount: input.totalAmount.toFixed(2),
                supplier: input.supplier || null,
                notes: input.notes || null,
                paymentMethod: 'CASH',
                paymentSource: 'Cash',
                paymentStatus: 'PAID',
                paidAt: now,
                deliveryStatus: 'RECEIVED',
                receivedAt: now,
            },
        });
        await addStockToMaterial(tx, input.rawMaterialId, input.quantity, input.totalAmount);
    });
    invalidateProjectionCache(shift.outletId);

    return getClosingSummary(shift.id, ctx);
}

/** Only the day's cash shopping can be removed from the till. */
export async function deleteShiftPurchase(ref: string, purchaseId: string, ctx: PosContext) {
    const { shift, date } = await openShiftDay(ref, ctx);
    const purchase = await prisma.inventoryPurchase.findFirst({
        where: { id: purchaseId, ...paidInCashOn(shift.outletId, date) },
    });
    if (!purchase) throw new ServiceError('Belanja tidak ditemukan di catatan hari ini', 404);

    await prisma.$transaction(async (tx) => {
        if (purchase.deliveryStatus === 'RECEIVED') {
            await removeStockFromMaterial(
                tx,
                purchase.rawMaterialId,
                Number(purchase.quantity),
                Number(purchase.totalAmount)
            );
        }
        await tx.inventoryPurchase.delete({ where: { id: purchase.id } });
    });
    invalidateProjectionCache(shift.outletId);

    return getClosingSummary(shift.id, ctx);
}

interface ShiftExpenseInput {
    category: string;
    amount: number;
    description?: string | null;
}

/** An operational cost paid with drawer cash, as the admin form records it. */
export async function addShiftExpense(ref: string, input: ShiftExpenseInput, ctx: PosContext) {
    const { shift, date } = await openShiftDay(ref, ctx);
    await prisma.expense.create({
        data: {
            outletId: shift.outletId,
            date: new Date(`${date}T00:00:00Z`),
            category: input.category,
            amount: input.amount,
            description: input.description || undefined,
            paymentMethod: 'CASH',
            paymentSource: 'Cash',
            paymentStatus: 'PAID',
            deliveryStatus: 'RECEIVED',
        },
    });
    return getClosingSummary(shift.id, ctx);
}

export async function deleteShiftExpense(ref: string, expenseId: string, ctx: PosContext) {
    const { shift, date } = await openShiftDay(ref, ctx);
    const expense = await prisma.expense.findFirst({
        where: { id: expenseId, ...paidInCashOn(shift.outletId, date) },
        select: { id: true },
    });
    if (!expense) throw new ServiceError('Pengeluaran tidak ditemukan di catatan hari ini', 404);

    await prisma.expense.delete({ where: { id: expense.id } });
    return getClosingSummary(shift.id, ctx);
}
