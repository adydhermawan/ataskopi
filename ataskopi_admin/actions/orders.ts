'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import {
    notifyOrderPreparing,
    notifyOrderReady,
    notifyOrderOnDelivery,
    notifyOrderCompleted,
    notifyOrderCancelled,
    notifyPointsEarned,
} from "@/lib/services/notification-service"
import { getCurrentUser } from "@/lib/auth-utils"
// import { requirePermission } from "@/lib/auth-utils"

export async function getOrders(filter: 'live' | 'history' = 'live') {
    // await requirePermission('orders', 'view')

    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    const where: any = {}

    // Filter by outlet if user is not admin or owner AND has a specific outlet assigned
    if (user.role !== 'admin' && user.role !== 'owner' && user.outletId) {
        where.outletId = user.outletId
    }

    if (filter === 'live') {
        where.orderStatus = {
            in: ['pending', 'preparing', 'ready', 'on_delivery', 'waiting_pickup']
        }
    } else {
        where.orderStatus = {
            in: ['completed', 'cancelled', 'rejected']
        }
    }

    const orders = await prisma.order.findMany({
        where,
        include: {
            user: true,
            items: {
                include: {
                    product: true,
                    variant: true,
                    selectedModifiers: {
                        include: {
                            modifier: true
                        }
                    },
                    selectedOptions: {
                        include: {
                            optionValue: {
                                include: {
                                    option: true
                                }
                            }
                        }
                    }
                }
            },
            outlet: true,
            table: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return orders.map(order => ({
        ...order,
        subtotal: order.subtotal.toNumber(),
        tax: order.tax.toNumber(),
        discount: order.discount.toNumber(),
        total: order.total.toNumber(),
        deliveryFee: order.deliveryFee.toNumber(),
        pointsDiscount: order.pointsDiscount.toNumber(),
        serviceFee: order.serviceFee.toNumber(),
        user: {
            ...order.user,
            totalSpent: order.user.totalSpent.toNumber(),
        },
        outlet: {
            ...order.outlet,
            latitude: order.outlet.latitude?.toNumber() ?? 0,
            longitude: order.outlet.longitude?.toNumber() ?? 0,
        },
        items: order.items.map(item => ({
            ...item,
            unitPrice: item.unitPrice.toNumber(),
            product: {
                ...item.product,
                basePrice: item.product.basePrice.toNumber(),
            },
            variant: item.variant ? {
                ...item.variant,
                priceModifier: item.variant.priceModifier.toNumber(),
            } : null,
            selectedModifiers: item.selectedModifiers.map(mod => ({
                ...mod,
                unitPrice: mod.unitPrice.toNumber(),
                modifier: {
                    ...mod.modifier,
                    price: mod.modifier.price.toNumber()
                }
            })),
            selectedOptions: item.selectedOptions.map(opt => ({
                ...opt,
                optionValue: {
                    ...opt.optionValue,
                    priceModifier: opt.optionValue.priceModifier.toNumber(),
                    option: opt.optionValue.option
                }
            }))
        }))
    }))
}

export async function updateOrderStatus(id: string, status: string) {
    // await requirePermission('orders', 'update')

    try {
        let pointsEarned = 0;
        let orderNumber = '';
        let userId = '';

        // Run in transaction to ensure consistency
        await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id },
                include: {
                    items: true,
                    user: true
                }
            })

            if (!order) throw new Error("Order not found")

            orderNumber = order.orderNumber;
            userId = order.userId;

            // Update status
            await tx.order.update({
                where: { id },
                data: { orderStatus: status }
            })

            // LOYALTY LOGIC: Award points when order is completed
            if (status === 'completed' && order.orderStatus !== 'completed') {

                // Get Loyalty Settings (Single Tenant: Get the first enabled setting or default)
                // Since we removed tenantId, we just get the first record or assume general settings
                const loyaltySetting = await tx.loyaltySetting.findFirst({
                    where: { isEnabled: true }
                })

                if (loyaltySetting) {
                    // Calculate points (Default: pointsPerItem * totalItems)
                    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)
                    pointsEarned = totalItems * loyaltySetting.pointsPerItem

                    if (pointsEarned > 0) {
                        // Update User Points
                        await tx.user.update({
                            where: { id: order.userId },
                            data: {
                                loyaltyPoints: { increment: pointsEarned },
                                totalItemsPurchased: { increment: totalItems },
                                totalSpent: { increment: order.total }
                            }
                        })

                        // Create Transaction Record
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
                                    rate: loyaltySetting.pointsPerItem
                                },
                                notes: `Earned ${pointsEarned} points from Order #${order.orderNumber}`
                            }
                        })
                    }
                }
            }
        })

        // NOTIFICATION TRIGGERS (outside transaction for safety)
        if (userId && orderNumber) {
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

        revalidatePath('/orders')
        revalidatePath('/orders/live')
        revalidatePath('/orders/history')
        return { success: true }
    } catch (error) {
        console.error("Failed to update order status:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to update order status" }
    }
}


export async function updatePaymentStatus(id: string, status: string) {
    // await requirePermission('orders', 'update')
    try {
        await prisma.order.update({
            where: { id },
            data: { paymentStatus: status }
        })
        revalidatePath('/orders')
        revalidatePath('/orders/live')
        revalidatePath('/orders/history')
        return { success: true }
    } catch (error) {
        console.error("Failed to update payment status:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to update payment status" }
    }
}

