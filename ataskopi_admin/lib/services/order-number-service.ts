import type { Prisma } from '@prisma/client';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

async function nextSequence(
    tx: Prisma.TransactionClient,
    outletId: string,
    date: string,
    scope: string,
    seed: () => Promise<number>
): Promise<number> {
    const key = { outletId, date, scope };
    const existing = await tx.orderCounter.findUnique({
        where: { outletId_date_scope: key },
    });
    const start = existing ? 0 : await seed();

    const counter = await tx.orderCounter.upsert({
        where: { outletId_date_scope: key },
        create: { ...key, lastSequence: start + 1 },
        update: { lastSequence: { increment: 1 } },
    });
    return counter.lastSequence;
}

/**
 * Allocates the next order number atomically, so concurrent orders from the
 * cashier and the customer app cannot share one.
 */
export async function generateOrderNumber(
    tx: Prisma.TransactionClient,
    outletId: string,
    now: Date = new Date()
): Promise<string> {
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6);
    const prefix = `${outletId.slice(0, 4)}${dateStr}`;

    // Numbers issued before the counter existed for today must not be reused.
    const sequence = await nextSequence(tx, outletId, dateStr, 'order_number', async () => {
        const lastOrder = await tx.order.findFirst({
            where: { outletId, orderNumber: { startsWith: prefix } },
            orderBy: { createdAt: 'desc' },
        });
        return lastOrder ? parseInt(lastOrder.orderNumber.split('-')[1] || '0') : 0;
    });

    return `${prefix}-${sequence.toString().padStart(3, '0')}`;
}

/**
 * Queue number for an online order, restarting every day in outlet time.
 */
export async function generateOnlineQueueNumber(
    tx: Prisma.TransactionClient,
    outletId: string,
    now: Date = new Date()
): Promise<string> {
    const date = new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
    const sequence = await nextSequence(tx, outletId, date, 'online_queue', async () => 0);
    return `O-${sequence.toString().padStart(3, '0')}`;
}
