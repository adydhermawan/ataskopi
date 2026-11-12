/**
 * @jest-environment node
 *
 * Calls the real route handlers. Skipped unless POS_TEST_DATABASE_URL points at
 * a disposable local database, for the same reason as pos-integration.test.ts.
 */
import { NextRequest } from 'next/server';
import type { PrismaClient } from '@prisma/client';

const testUrl = process.env.POS_TEST_DATABASE_URL;
const isLocal = !!testUrl && /@(localhost|127\.0\.0\.1)[:/]/.test(testUrl);
const describeDb = isLocal ? describe : describe.skip;

describeDb('order routes on a real database', () => {
    let prisma: PrismaClient;
    let customerOrders: typeof import('@/app/api/orders/route');
    let catalogRoute: typeof import('@/app/api/pos/catalog/route');
    let statusRoute: typeof import('@/app/api/pos/orders/[id]/status/route');
    let syncRoute: typeof import('@/app/api/pos/orders/sync/route');

    let run = 0;
    let outletId: string;
    let otherOutletId: string;
    let productId: string;
    let soldOutProductId: string;
    let optionId: string;
    let valueId: string;
    let modifierId: string;
    let customerToken: string;
    let kasirToken: string;
    let otherKasirToken: string;
    let shiftId: string;

    const uid = (label: string) => `${label}-${Date.now()}-${run++}`;

    function request(path: string, token: string, method = 'GET', body?: unknown) {
        return new NextRequest(`http://localhost${path}`, {
            method,
            headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    const noContext = {} as never;
    const idContext = (id: string) => ({ params: Promise.resolve({ id }) });

    function customerOrder(overrides = {}) {
        return {
            outletId,
            orderType: 'pickup',
            paymentMethod: 'cash',
            items: [
                {
                    productId,
                    quantity: 2,
                    selectedOptions: [{ optionId, valueId }],
                    selectedModifiers: [{ modifierId, quantity: 1 }],
                },
            ],
            ...overrides,
        };
    }

    beforeAll(async () => {
        process.env.POSTGRES_PRISMA_URL = testUrl;
        process.env.POSTGRES_URL_NON_POOLING = testUrl;

        ({ db: prisma } = await import('@/lib/db'));
        customerOrders = await import('@/app/api/orders/route');
        catalogRoute = await import('@/app/api/pos/catalog/route');
        statusRoute = await import('@/app/api/pos/orders/[id]/status/route');
        syncRoute = await import('@/app/api/pos/orders/sync/route');
        const { signJwt } = await import('@/lib/jwt-utils');

        const outlet = await prisma.outlet.create({ data: { name: uid('Outlet') } });
        const other = await prisma.outlet.create({ data: { name: uid('Outlet') } });
        outletId = outlet.id;
        otherOutletId = other.id;

        const category = await prisma.category.create({ data: { name: uid('Kopi'), slug: uid('kopi') } });
        const product = await prisma.product.create({
            data: {
                name: 'Latte',
                categoryId: category.id,
                basePrice: 20000,
                options: {
                    create: {
                        name: 'Ukuran',
                        values: { create: { name: 'Large', priceModifier: 5000 } },
                    },
                },
                modifiers: { create: { name: 'Extra shot', price: 4000 } },
            },
            include: { options: { include: { values: true } }, modifiers: true },
        });
        const soldOut = await prisma.product.create({
            data: { name: 'Habis', categoryId: category.id, basePrice: 10000 },
        });
        await prisma.outletProduct.create({
            data: { outletId, productId: soldOut.id, isAvailable: false },
        });
        await prisma.orderModeSetting.deleteMany();
        await prisma.orderModeSetting.create({ data: { taxEnabled: false } });

        productId = product.id;
        soldOutProductId = soldOut.id;
        optionId = product.options[0].id;
        valueId = product.options[0].values[0].id;
        modifierId = product.modifiers[0].id;

        const token = async (role: string, staffOutletId?: string) => {
            const user = await prisma.user.create({
                data: { phone: uid('user'), name: role, role, outletId: staffOutletId },
            });
            return signJwt({ sub: user.id, phone: user.phone, name: user.name, role, outletId: staffOutletId ?? null });
        };
        customerToken = await token('customer');
        kasirToken = await token('kasir', outletId);
        otherKasirToken = await token('kasir', otherOutletId);

        const shift = await prisma.shift.create({
            data: { outletId, clientShiftId: uid('shift'), cashierId: 'kasir', openingCash: 0 },
        });
        shiftId = shift.id;
    });

    afterAll(async () => {
        await prisma?.$disconnect();
    });

    it('still prices and creates a customer order', async () => {
        const response = await customerOrders.POST(
            request('/api/orders', customerToken, 'POST', customerOrder()),
            noContext
        );
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(body.data.subtotal).toBe(58000);
        expect(body.data.tax).toBe(0);
        expect(body.data.total).toBe(58000);
        expect(body.data.orderNumber).toMatch(/-\d{3}$/);

        const saved = await prisma.order.findUnique({
            where: { id: body.data.id },
            include: { items: { include: { selectedModifiers: true, selectedOptions: true } } },
        });
        expect(saved?.source).toBe('customer_app');
        expect(saved?.channel).toBe('app');
        expect(saved?.items[0].selectedModifiers).toHaveLength(1);
        expect(saved?.items[0].selectedOptions).toHaveLength(1);
    });

    it('returns the same error for a bad option as before', async () => {
        const response = await customerOrders.POST(
            request('/api/orders', customerToken, 'POST', customerOrder({
                items: [{ productId, quantity: 1, selectedOptions: [{ optionId: 'nope', valueId }] }],
            })),
            noContext
        );

        expect(response.status).toBe(400);
        expect((await response.json()).error).toContain('Invalid option');
    });

    it('refuses a product sold out at this outlet', async () => {
        const response = await customerOrders.POST(
            request('/api/orders', customerToken, 'POST', customerOrder({
                items: [{ productId: soldOutProductId, quantity: 1 }],
            })),
            noContext
        );

        expect(response.status).toBe(404);
    });

    it('refuses online orders while paused', async () => {
        await prisma.outlet.update({ where: { id: outletId }, data: { onlineOrdersPaused: true } });
        const response = await customerOrders.POST(
            request('/api/orders', customerToken, 'POST', customerOrder()),
            noContext
        );
        await prisma.outlet.update({ where: { id: outletId }, data: { onlineOrdersPaused: false } });

        expect(response.status).toBe(400);
    });

    it('shows on_delivery orders to the customer app filter', async () => {
        const created = await customerOrders.POST(
            request('/api/orders', customerToken, 'POST', customerOrder()),
            noContext
        );
        const { data } = await created.json();
        await prisma.order.update({ where: { id: data.id }, data: { orderStatus: 'on_delivery' } });

        const response = await customerOrders.GET(
            request('/api/orders?status=pending,on_the_way', customerToken),
            noContext
        );
        const body = await response.json();
        const list = body.data ?? [];

        expect(JSON.stringify(list)).toContain(data.id);
    });

    it('keeps customers out of POS routes', async () => {
        const response = await catalogRoute.GET(
            request(`/api/pos/catalog?outletId=${outletId}`, customerToken),
            noContext
        );
        expect(response.status).toBe(403);
    });

    it('keeps a cashier inside their own outlet', async () => {
        const mine = await catalogRoute.GET(
            request(`/api/pos/catalog?outletId=${outletId}`, kasirToken),
            noContext
        );
        const theirs = await catalogRoute.GET(
            request(`/api/pos/catalog?outletId=${outletId}`, otherKasirToken),
            noContext
        );

        expect(mine.status).toBe(200);
        expect(theirs.status).toBe(403);
    });

    it('syncs through the route and blocks cancelling without a void', async () => {
        const clientOrderId = uid('order');
        const response = await syncRoute.POST(
            request('/api/pos/orders/sync', kasirToken, 'POST', {
                outletId,
                orders: [
                    {
                        clientOrderId,
                        orderType: 'pickup',
                        queueNumber: 'A-001',
                        shiftId,
                        createdAt: new Date().toISOString(),
                        items: [{ productId, quantity: 1, unitPrice: 20000 }],
                        subtotal: 20000,
                        total: 20000,
                    },
                ],
            }),
            noContext
        );
        const { data } = await response.json();
        expect(data.results[0].status).toBe('created');

        const cancelled = await statusRoute.PATCH(
            request(`/api/pos/orders/${clientOrderId}/status`, kasirToken, 'PATCH', {
                status: 'cancelled',
                expectedStatus: 'preparing',
            }),
            idContext(clientOrderId)
        );
        expect(cancelled.status).toBe(400);

        const wrongDevice = await statusRoute.PATCH(
            request(`/api/pos/orders/${clientOrderId}/status`, kasirToken, 'PATCH', {
                status: 'ready',
                expectedStatus: 'pending',
            }),
            idContext(clientOrderId)
        );
        expect(wrongDevice.status).toBe(409);
    });
});
