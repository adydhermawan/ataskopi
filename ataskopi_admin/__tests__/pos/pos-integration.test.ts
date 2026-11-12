/**
 * @jest-environment node
 *
 * Runs the POS flows against a real Postgres. Skipped unless
 * POS_TEST_DATABASE_URL points at a disposable local database that already has
 * the schema, because it creates and leaves test rows behind.
 */
import type { PrismaClient } from '@prisma/client';

const testUrl = process.env.POS_TEST_DATABASE_URL;
const isLocal = !!testUrl && /@(localhost|127\.0\.0\.1)[:/]/.test(testUrl);
const describeDb = isLocal ? describe : describe.skip;

describeDb('POS flows on a real database', () => {
    let prisma: PrismaClient;
    let orders: typeof import('@/lib/services/pos-order-service');
    let shifts: typeof import('@/lib/services/pos-shift-service');
    let status: typeof import('@/lib/services/order-status-service');
    let numbers: typeof import('@/lib/services/order-number-service');
    let catalog: typeof import('@/lib/services/pos-catalog-service');

    let run = 0;
    let outletId: string;
    let cashierId: string;
    let customerId: string;
    let productId: string;
    let shiftId: string;
    let ctx: { actorId: string; outletScope: string | null };

    const uid = (label: string) => `${label}-${Date.now()}-${run++}`;

    function sale(overrides: Record<string, unknown> = {}) {
        return {
            clientOrderId: uid('order'),
            revision: 0,
            orderType: 'pickup' as const,
            channel: 'walk_in' as const,
            queueNumber: 'A-001',
            shiftId,
            createdAt: new Date().toISOString(),
            items: [
                {
                    productId,
                    quantity: 2,
                    unitPrice: 20000,
                    selectedOptions: [],
                    selectedModifiers: [],
                },
            ],
            subtotal: 40000,
            discount: 0,
            tax: 0,
            total: 40000,
            payments: [] as { clientPaymentId: string; method: 'cash' | 'qris'; amount: number }[],
            ...overrides,
        };
    }

    const cash = (amount: number) => ({ clientPaymentId: uid('pay'), method: 'cash' as const, amount });

    beforeAll(async () => {
        process.env.POSTGRES_PRISMA_URL = testUrl;
        process.env.POSTGRES_URL_NON_POOLING = testUrl;

        ({ db: prisma } = await import('@/lib/db'));
        orders = await import('@/lib/services/pos-order-service');
        shifts = await import('@/lib/services/pos-shift-service');
        status = await import('@/lib/services/order-status-service');
        numbers = await import('@/lib/services/order-number-service');
        catalog = await import('@/lib/services/pos-catalog-service');

        const outlet = await prisma.outlet.create({ data: { name: uid('Outlet') } });
        const cashier = await prisma.user.create({
            data: { phone: uid('kasir'), name: 'Kasir', role: 'kasir', outletId: outlet.id },
        });
        const customer = await prisma.user.create({
            data: { phone: uid('member'), name: 'Member', role: 'customer' },
        });
        const category = await prisma.category.create({
            data: { name: uid('Kopi'), slug: uid('kopi') },
        });
        const product = await prisma.product.create({
            data: { name: 'Kopi Susu', categoryId: category.id, basePrice: 20000 },
        });
        await prisma.loyaltySetting.create({ data: { isEnabled: true, pointsPerItem: 5 } });

        outletId = outlet.id;
        cashierId = cashier.id;
        customerId = customer.id;
        productId = product.id;
        ctx = { actorId: cashierId, outletScope: outletId };

        const shift = await shifts.openShift(
            { outletId, clientShiftId: uid('shift'), openingCash: 100000 },
            ctx
        );
        shiftId = shift.id;
    });

    afterAll(async () => {
        await prisma?.$disconnect();
    });

    it('stores a retried order once and keeps a single payment', async () => {
        const input = sale({ payments: [cash(40000)] });

        const first = await orders.syncPosOrder(input, outletId, cashierId);
        const second = await orders.syncPosOrder(input, outletId, cashierId);

        expect(first.status).toBe('created');
        expect(second.status).toBe('duplicate');
        expect(second.orderId).toBe(first.orderId);

        const saved = await prisma.order.findUnique({
            where: { id: first.orderId },
            include: { payments: true, items: true },
        });
        expect(saved?.payments).toHaveLength(1);
        expect(saved?.items).toHaveLength(1);
        expect(saved?.paymentStatus).toBe('paid');
        expect(saved?.orderStatus).toBe('preparing');
        expect(saved?.source).toBe('pos');
    });

    it('survives the same order arriving twice at the same moment', async () => {
        const input = sale({ payments: [cash(40000)] });

        const results = await Promise.all([
            orders.syncPosOrder(input, outletId, cashierId),
            orders.syncPosOrder(input, outletId, cashierId),
        ]);

        expect(results.map((r) => r.status).sort()).toEqual(['created', 'duplicate']);
        expect(await prisma.order.count({ where: { clientOrderId: input.clientOrderId } })).toBe(1);
    });

    it('gives concurrent orders distinct numbers', async () => {
        const results = await Promise.all(
            Array.from({ length: 8 }, () => orders.syncPosOrder(sale(), outletId, cashierId))
        );

        expect(results.every((r) => r.status === 'created')).toBe(true);
        expect(new Set(results.map((r) => r.orderNumber)).size).toBe(8);
    });

    it('never gives walk-in orders points or notifications', async () => {
        const result = await orders.syncPosOrder(sale({ payments: [cash(40000)] }), outletId, cashierId);

        const outcome = await status.transitionOrderStatus({ orderId: result.orderId!, status: 'completed' });

        expect(outcome.pointsEarned).toBe(0);
        const cashier = await prisma.user.findUnique({ where: { id: cashierId } });
        expect(cashier?.loyaltyPoints).toBe(0);
        const walkIn = await prisma.user.findUnique({ where: { phone: 'walk-in' } });
        expect(walkIn?.loyaltyPoints).toBe(0);
        expect(await prisma.notification.count({ where: { userId: walkIn!.id } })).toBe(0);
    });

    it('awards points to a member and only once', async () => {
        const result = await orders.syncPosOrder(
            sale({ customerId, payments: [cash(40000)] }),
            outletId,
            cashierId
        );

        const outcome = await status.transitionOrderStatus({ orderId: result.orderId!, status: 'completed' });
        await status.transitionOrderStatus({ orderId: result.orderId!, status: 'completed' });

        expect(outcome.pointsEarned).toBe(10);
        const member = await prisma.user.findUnique({ where: { id: customerId } });
        expect(member?.loyaltyPoints).toBe(10);
    });

    it('lets only the first of two devices accept an order', async () => {
        const result = await orders.syncPosOrder(sale(), outletId, cashierId);
        const orderId = result.orderId!;

        const attempts = await Promise.allSettled([
            status.transitionOrderStatus({ orderId, status: 'ready', expectedStatus: 'preparing' }),
            status.transitionOrderStatus({ orderId, status: 'ready', expectedStatus: 'preparing' }),
        ]);

        expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(1);
    });

    it('assigns an online queue number when an online order is accepted', async () => {
        const order = await prisma.order.create({
            data: {
                userId: customerId,
                outletId,
                orderNumber: uid('online'),
                orderType: 'pickup',
                subtotal: 20000,
                total: 20000,
                paymentMethod: 'cash',
            },
        });

        const outcome = await status.transitionOrderStatus({
            orderId: order.id,
            status: 'preparing',
            expectedStatus: 'pending',
        });

        expect(outcome.queueNumber).toMatch(/^O-\d{3}$/);
    });

    it('updates items when an open bill grows, and asks for the rest', async () => {
        const input = sale({ payments: [cash(40000)] });
        const first = await orders.syncPosOrder(input, outletId, cashierId);

        const grown = {
            ...input,
            revision: 1,
            items: [{ ...input.items[0], quantity: 3 }],
            subtotal: 60000,
            total: 60000,
        };
        const second = await orders.syncPosOrder(grown, outletId, cashierId);

        expect(second.status).toBe('updated');
        const saved = await prisma.order.findUnique({
            where: { id: first.orderId },
            include: { items: true, payments: true },
        });
        expect(saved?.items).toHaveLength(1);
        expect(saved?.items[0].quantity).toBe(3);
        expect(saved?.payments).toHaveLength(1);
        expect(saved?.paymentStatus).toBe('pending');

        const stale = await orders.syncPosOrder(input, outletId, cashierId);
        expect(stale.status).toBe('duplicate');
        const after = await prisma.order.findUnique({ where: { id: first.orderId } });
        expect(Number(after?.total)).toBe(60000);
    });

    it('pays an order with split payments using the offline id', async () => {
        const input = sale();
        await orders.syncPosOrder(input, outletId, cashierId);

        await orders.recordPosPayment(input.clientOrderId, cash(10000), ctx);
        const paid = await orders.recordPosPayment(
            input.clientOrderId,
            { clientPaymentId: uid('pay'), method: 'qris', amount: 30000 },
            ctx
        );

        expect(paid).toMatchObject({ paymentStatus: 'paid', paymentMethod: 'split' });
        await expect(orders.recordPosPayment(input.clientOrderId, cash(1), ctx)).rejects.toThrow('melebihi');
    });

    it('voids an unpaid order but refuses a paid one', async () => {
        const unpaid = await orders.syncPosOrder(sale(), outletId, cashierId);
        const voided = await orders.voidPosOrder(unpaid.orderId!, 'Salah input', ctx);
        expect(voided.orderStatus).toBe('cancelled');
        expect(await prisma.auditLog.count({ where: { entityId: unpaid.orderId, action: 'void' } })).toBe(1);

        const paid = await orders.syncPosOrder(sale({ payments: [cash(40000)] }), outletId, cashierId);
        await expect(orders.voidPosOrder(paid.orderId!, 'Salah', ctx)).rejects.toThrow('refund');
    });

    it('limits refunds to what was paid and is safe to retry', async () => {
        const result = await orders.syncPosOrder(sale({ payments: [cash(40000)] }), outletId, cashierId);
        const orderId = result.orderId!;
        const partial = {
            clientRefundId: uid('refund'),
            method: 'cash',
            amount: 10000,
            reason: 'Salah menu',
        };

        expect((await orders.refundPosOrder(orderId, partial, ctx)).paymentStatus).toBe('paid');
        await orders.refundPosOrder(orderId, partial, ctx);
        expect(await prisma.orderRefund.count({ where: { orderId } })).toBe(1);

        await expect(
            orders.refundPosOrder(orderId, { ...partial, clientRefundId: uid('refund'), amount: 40000 }, ctx)
        ).rejects.toThrow('melebihi');

        const full = await orders.refundPosOrder(
            orderId,
            { ...partial, clientRefundId: uid('refund'), amount: 30000 },
            ctx
        );
        expect(full).toMatchObject({ paymentStatus: 'refunded', orderStatus: 'cancelled' });
    });

    it('rejects another outlet without leaking the order', async () => {
        const result = await orders.syncPosOrder(sale(), outletId, cashierId);
        const stranger = { actorId: cashierId, outletScope: 'another-outlet' };

        await expect(orders.voidPosOrder(result.orderId!, 'x', stranger)).rejects.toThrow('outlet');
    });

    it('rejects a bad order without stopping the app', async () => {
        const result = await orders.syncPosOrder(
            sale({ items: [{ productId: 'missing', quantity: 1, unitPrice: 40000, selectedOptions: [], selectedModifiers: [] }] }),
            outletId,
            cashierId
        );
        expect(result.status).toBe('rejected');
    });

    it('records a price difference instead of losing the sale', async () => {
        const input = sale({
            items: [{ productId, quantity: 2, unitPrice: 18000, selectedOptions: [], selectedModifiers: [] }],
            subtotal: 36000,
            total: 36000,
        });
        const result = await orders.syncPosOrder(input, outletId, cashierId);

        expect(result.status).toBe('created');
        expect(await prisma.auditLog.count({ where: { entityId: result.orderId, action: 'price_mismatch' } })).toBe(1);
    });

    it('closes a shift with the right cash difference, once', async () => {
        const outlet = await prisma.outlet.create({ data: { name: uid('Outlet') } });
        const shiftCtx = { actorId: cashierId, outletScope: outlet.id };
        const shift = await shifts.openShift(
            { outletId: outlet.id, clientShiftId: uid('shift'), openingCash: 100000 },
            shiftCtx
        );
        await expect(
            shifts.openShift({ outletId: outlet.id, clientShiftId: uid('shift'), openingCash: 1 }, shiftCtx)
        ).rejects.toThrow('belum ditutup');

        const paid = await orders.syncPosOrder(
            sale({ shiftId: shift.clientShiftId, payments: [cash(40000)] }),
            outlet.id,
            cashierId
        );
        await orders.syncPosOrder(
            sale({
                shiftId: shift.id,
                payments: [{ clientPaymentId: uid('pay'), method: 'qris', amount: 40000 }],
            }),
            outlet.id,
            cashierId
        );
        await orders.refundPosOrder(
            paid.orderId!,
            { clientRefundId: uid('refund'), method: 'cash', amount: 5000, reason: 'Salah', shiftId: shift.id },
            shiftCtx
        );
        const movement = { clientMovementId: uid('move'), type: 'out', amount: 15000, reason: 'Beli es' };
        await shifts.addCashMovement(shift.id, movement, shiftCtx);
        await shifts.addCashMovement(shift.id, movement, shiftCtx);

        const closed = await shifts.closeShift(shift.id, { actualCash: 119000 }, shiftCtx);
        expect(closed.expectedCash).toBe(120000);
        expect(closed.cashDifference).toBe(-1000);
        expect(closed.salesByMethod).toEqual({ cash: 40000, qris: 40000 });

        const again = await shifts.closeShift(shift.id, { actualCash: 999 }, shiftCtx);
        expect(again.actualCash).toBe(119000);
    });

    it('serves the catalog with channel prices and outlet availability', async () => {
        await prisma.productChannelPrice.create({ data: { productId, channel: 'grab', price: 26000 } });
        await prisma.outletProduct.create({ data: { outletId, productId, isAvailable: false } });

        const data = await catalog.getPosCatalog(outletId);
        const item = data.products.find((p) => p.id === productId);

        expect(item?.channelPrices).toEqual({ grab: 26000 });
        expect(item?.isAvailable).toBe(false);
        expect(item?.soldLast30Days).toBeGreaterThan(0);
    });

    it('only lists online orders in the inbox and records the heartbeat', async () => {
        const data = await catalog.getPosInbox(outletId);

        expect(data.orders.every((o) => o.orderNumber.startsWith('online'))).toBe(true);
        const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
        expect(outlet?.posLastSeenAt).not.toBeNull();
    });

    it('continues numbering from orders issued before the counter existed', async () => {
        const outlet = await prisma.outlet.create({ data: { name: uid('Outlet') } });
        const now = new Date();
        const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6);
        await prisma.order.create({
            data: {
                userId: customerId,
                outletId: outlet.id,
                orderNumber: `${outlet.id.slice(0, 4)}${dateStr}-007`,
                orderType: 'pickup',
                subtotal: 1,
                total: 1,
            },
        });

        const next = await prisma.$transaction((tx) => numbers.generateOrderNumber(tx, outlet.id, now));
        expect(next.endsWith('-008')).toBe(true);
    });
});
