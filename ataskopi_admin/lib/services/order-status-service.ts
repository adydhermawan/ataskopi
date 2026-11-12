import { db as prisma } from '@/lib/db';
import { generateOnlineQueueNumber } from '@/lib/services/order-number-service';
import { ServiceError } from '@/lib/services/service-error';
import {
    notifyOrderPreparing,
    notifyOrderReady,
    notifyOrderOnDelivery,
    notifyOrderCompleted,
    notifyOrderCancelled,
    notifyPointsEarned,
} from '@/lib/services/notification-service';

interface PaymentState {
    paymentStatus: string;
    paymentMethod: string | null;
    source: string;
}

/**
 * Cashier orders may be paid at the end, so only prepaid online orders have
 * to be paid before the bar starts.
 *
 * At the cashier app any order may start unpaid, because the cashier can take
 * the payment at the counter; it just cannot be completed until it is paid.
 */
export function assertPaymentAllowsStatus(order: PaymentState, status: string, cashierCollects = false) {
    const isUnpaid = order.paymentStatus === 'pending';
    const isManualPayment =
        order.paymentMethod === 'cash' || order.paymentMethod === 'manual' || order.source === 'pos';

    if (cashierCollects) {
        if (status === 'completed' && isUnpaid) {
            throw new ServiceError('Order belum lunas. Catat pembayarannya dulu.');
        }
        return;
    }

    if (status === 'preparing' && isUnpaid && !isManualPayment) {
        throw new ServiceError('Cannot start preparing. Order must be PAID first.');
    }

    if (status === 'completed' && isManualPayment && isUnpaid) {
        throw new ServiceError('Cannot complete order. Payment must be marked as PAID first.');
    }
}

interface TransitionInput {
    orderId: string;
    status: string;
    // When set, the update fails if another device already moved the order.
    expectedStatus?: string;
    // Set by the cashier app, which can take the payment at the counter.
    cashierCollects?: boolean;
}

/**
 * Moves an order to a new status, awarding points and notifying the customer.
 * Shared by the web dashboard and the POS app.
 */
export async function transitionOrderStatus({ orderId, status, expectedStatus, cashierCollects }: TransitionInput) {
    let pointsEarned = 0;

    const result = await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: { id: orderId },
            include: {
                items: true,
                user: true,
            },
        });

        if (!order) throw new ServiceError('Order not found', 404);

        if (expectedStatus && order.orderStatus !== expectedStatus) {
            throw new ServiceError(`Order sudah berstatus ${order.orderStatus}`, 409);
        }

        assertPaymentAllowsStatus(order, status, cashierCollects);

        const needsQueueNumber = status === 'preparing' && !order.queueNumber && order.source !== 'pos';
        const queueNumber = needsQueueNumber
            ? await generateOnlineQueueNumber(tx, order.outletId)
            : order.queueNumber;

        const updated = await tx.order.updateMany({
            where: { id: orderId, orderStatus: order.orderStatus },
            data: { orderStatus: status, queueNumber },
        });

        if (updated.count === 0) {
            throw new ServiceError('Order sudah diubah perangkat lain', 409);
        }

        const isCustomer = order.user.role === 'customer';

        // LOYALTY LOGIC: Award points when order is completed
        if (status === 'completed' && order.orderStatus !== 'completed' && isCustomer) {
            const loyaltySetting = await tx.loyaltySetting.findFirst({
                where: { isEnabled: true },
            });

            if (loyaltySetting) {
                // Calculate points (Default: pointsPerItem * totalItems)
                const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
                pointsEarned = totalItems * loyaltySetting.pointsPerItem;

                if (pointsEarned > 0) {
                    await tx.user.update({
                        where: { id: order.userId },
                        data: {
                            loyaltyPoints: { increment: pointsEarned },
                            totalItemsPurchased: { increment: totalItems },
                            totalSpent: { increment: order.total },
                        },
                    });

                    await tx.loyaltyTransaction.create({
                        data: {
                            userId: order.userId,
                            orderId: order.id,
                            transactionType: 'earned',
                            pointsChange: pointsEarned,
                            pointsBalanceAfter: order.user.loyaltyPoints + pointsEarned,
                            earningMethod: 'per_item',
                            calculationDetails: {
                                items: totalItems,
                                rate: loyaltySetting.pointsPerItem,
                            },
                            notes: `Earned ${pointsEarned} points from Order #${order.orderNumber}`,
                        },
                    });
                }
            }
        }

        return {
            userId: order.userId,
            orderNumber: order.orderNumber,
            isCustomer,
            queueNumber,
        };
    });

    // NOTIFICATION TRIGGERS (outside transaction for safety)
    if (result.isCustomer) {
        const { userId, orderNumber } = result;
        switch (status) {
            case 'preparing':
                await notifyOrderPreparing(userId, orderNumber);
                break;
            case 'ready':
            case 'waiting_pickup':
                await notifyOrderReady(userId, orderNumber);
                break;
            case 'on_delivery':
                await notifyOrderOnDelivery(userId, orderNumber);
                break;
            case 'completed':
                await notifyOrderCompleted(userId, orderNumber);
                // Also notify about points earned
                if (pointsEarned > 0) {
                    await notifyPointsEarned(userId, pointsEarned, orderNumber);
                }
                break;
            case 'cancelled':
            case 'rejected':
                await notifyOrderCancelled(userId, orderNumber);
                break;
        }
    }

    return { orderId, status, queueNumber: result.queueNumber, pointsEarned };
}
