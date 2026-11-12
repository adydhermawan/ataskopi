import { db as prisma } from '@/lib/db';
import { ACTIVE_ORDER_STATUSES } from '@/lib/order-status';
import { collectedAmount } from '@/lib/services/pos-order-service';
import { ServiceError } from '@/lib/services/service-error';

const SALES_RANK_DAYS = 30;
const INBOX_LIMIT = 100;
const HEARTBEAT_INTERVAL_MS = 60 * 1000;
// An order committed just after a poll can carry an earlier updatedAt, so each
// poll re-reads a short window. The app de-duplicates by id and updatedAt.
const INBOX_OVERLAP_MS = 10 * 1000;

/**
 * Everything the app caches to sell while offline, in a single request.
 */
export async function getPosCatalog(outletId: string) {
    const salesSince = new Date(Date.now() - SALES_RANK_DAYS * 24 * 60 * 60 * 1000);

    const [outlet, settings, categories, products, sales] = await Promise.all([
        prisma.outlet.findFirst({ where: { id: outletId, isActive: true } }),
        prisma.orderModeSetting.findFirst(),
        prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
        prisma.product.findMany({
            where: { isAvailable: true },
            include: {
                options: {
                    where: { isAvailable: true },
                    include: {
                        values: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } },
                    },
                    orderBy: { sortOrder: 'asc' },
                },
                modifiers: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } },
                outletProducts: { where: { outletId } },
                channelPrices: true,
            },
            orderBy: { name: 'asc' },
        }),
        prisma.orderItem.groupBy({
            by: ['productId'],
            where: { order: { outletId, createdAt: { gte: salesSince } } },
            _sum: { quantity: true },
        }),
    ]);

    if (!outlet) throw new ServiceError('Outlet not found or inactive', 404);

    const soldByProduct = new Map(sales.map((row) => [row.productId, row._sum.quantity ?? 0]));

    return {
        generatedAt: new Date().toISOString(),
        outlet: {
            id: outlet.id,
            name: outlet.name,
            address: outlet.address,
            onlineOrdersPaused: outlet.onlineOrdersPaused,
        },
        settings: {
            taxEnabled: settings?.taxEnabled ?? true,
            qrisQrCodeUrl: settings?.qrisQrCodeUrl ?? null,
        },
        // Only categories that have something to sell, in menu order.
        categories: categories
            .filter((category) => products.some((product) => product.categoryId === category.id))
            .map((category) => ({ id: category.id, name: category.name })),
        products: products.map((product) => ({
            id: product.id,
            categoryId: product.categoryId,
            name: product.name,
            imageUrl: product.imageUrl,
            basePrice: Number(product.basePrice),
            isAvailable: product.outletProducts[0]?.isAvailable !== false,
            soldLast30Days: soldByProduct.get(product.id) ?? 0,
            channelPrices: Object.fromEntries(
                product.channelPrices.map((price) => [price.channel, Number(price.price)])
            ),
            options: product.options.map((option) => ({
                id: option.id,
                name: option.name,
                minSelect: option.minSelect,
                maxSelect: option.maxSelect,
                values: option.values.map((value) => ({
                    id: value.id,
                    name: value.name,
                    priceModifier: Number(value.priceModifier),
                    isDefault: value.isDefault,
                })),
            })),
            modifiers: product.modifiers.map((modifier) => ({
                id: modifier.id,
                name: modifier.name,
                price: Number(modifier.price),
            })),
        })),
    };
}

async function recordHeartbeat(outletId: string, now: Date) {
    await prisma.outlet.updateMany({
        where: {
            id: outletId,
            OR: [
                { posLastSeenAt: null },
                { posLastSeenAt: { lt: new Date(now.getTime() - HEARTBEAT_INTERVAL_MS) } },
            ],
        },
        data: { posLastSeenAt: now },
    });
}

/**
 * Whether a choice is the one a single tap makes in the cashier app: the
 * value marked default, or the first one of a required option without a
 * marked default.
 */
export function isStandardChoice(value: {
    id: string;
    option: { minSelect: number; values: { id: string; isDefault: boolean }[] };
}) {
    const { minSelect, values } = value.option;
    if (minSelect === 0 || values.length === 0) return false;
    const standard = values.find((candidate) => candidate.isDefault) ?? values[0];
    return standard.id === value.id;
}

/**
 * Online orders changed since the app last asked. Without `since` it returns
 * every active order, for a fresh start of the app.
 */
export async function getPosInbox(outletId: string, since?: Date) {
    const serverTime = new Date();
    await recordHeartbeat(outletId, serverTime);

    const orders = await prisma.order.findMany({
        where: {
            outletId,
            source: 'customer_app',
            ...(since ? { updatedAt: { gte: since } } : { orderStatus: { in: ACTIVE_ORDER_STATUSES } }),
        },
        include: {
            user: { select: { name: true, phone: true } },
            table: { select: { tableNumber: true } },
            payments: { select: { amount: true } },
            items: {
                include: {
                    product: { select: { name: true } },
                    selectedModifiers: { include: { modifier: { select: { name: true } } } },
                    selectedOptions: {
                        include: {
                            optionValue: {
                                select: {
                                    id: true,
                                    name: true,
                                    option: {
                                        select: {
                                            minSelect: true,
                                            values: {
                                                where: { isAvailable: true },
                                                orderBy: { sortOrder: 'asc' },
                                                select: { id: true, isDefault: true },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: { updatedAt: 'asc' },
        take: INBOX_LIMIT,
    });

    // A full page means more is waiting, so continue from the last row seen.
    const nextSince =
        orders.length === INBOX_LIMIT
            ? orders[orders.length - 1].updatedAt
            : new Date(serverTime.getTime() - INBOX_OVERLAP_MS);

    return {
        nextSince: nextSince.toISOString(),
        orders: orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            queueNumber: order.queueNumber,
            orderType: order.orderType,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            customerName: order.guestName || order.user.name,
            customerPhone: order.user.phone,
            tableNumber: order.table?.tableNumber ?? null,
            scheduledTime: order.scheduledTime?.toISOString() ?? null,
            deliveryAddress: order.deliveryAddress,
            notes: order.notes,
            total: Number(order.total),
            // What the cashier has collected so far, so a split payment shows what is left.
            paidAmount: collectedAmount(order),
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
            items: order.items.map((item) => ({
                name: item.product.name,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                notes: item.notes,
                options: item.selectedOptions.map((option) => option.optionValue.name),
                modifiers: item.selectedModifiers.map((modifier) => modifier.modifier.name),
                // Only what differs from the standard drink, for the bar ticket.
                requests: [
                    ...item.selectedOptions
                        .filter((option) => !isStandardChoice(option.optionValue))
                        .map((option) => option.optionValue.name),
                    ...item.selectedModifiers.map((modifier) => modifier.modifier.name),
                ],
            })),
        })),
    };
}
