'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getCurrentUser, requirePermission } from "@/lib/auth-utils"
import { ACTIVE_ORDER_STATUSES } from "@/lib/order-status"
import { transitionOrderStatus } from "@/lib/services/order-status-service"

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
            in: ACTIVE_ORDER_STATUSES
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
    try {
        await requirePermission('orders', 'update')
        await transitionOrderStatus({ orderId: id, status })

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
    try {
        await requirePermission('orders', 'update')
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

/**
 * Fetch live orders — callable from client components for polling.
 * Wrapper around getOrders('live').
 */
export async function fetchLiveOrders() {
    return await getOrders('live')
}

export async function deleteOrder(id: string) {
    try {
        const user = await getCurrentUser()
        if (!user) throw new Error("Unauthorized")

        if (user.role !== 'admin' && user.role !== 'owner') {
            throw new Error("Forbidden: Only administrators and owners can delete orders")
        }

        await prisma.$transaction(async (tx) => {
            // 1. Get all order item IDs
            const orderItems = await tx.orderItem.findMany({
                where: { orderId: id },
                select: { id: true }
            })
            const orderItemIds = orderItems.map(item => item.id)

            // 2. Delete order item options and modifiers
            if (orderItemIds.length > 0) {
                await tx.orderItemOption.deleteMany({
                    where: { orderItemId: { in: orderItemIds } }
                })
                await tx.orderItemModifier.deleteMany({
                    where: { orderItemId: { in: orderItemIds } }
                })
            }

            // 3. Delete order items
            await tx.orderItem.deleteMany({ where: { orderId: id } })

            // 4. Reset vouchers associated with this order
            await tx.userVoucher.updateMany({
                where: { orderId: id },
                data: { isUsed: false, orderId: null, usedAt: null }
            })

            // 5. Delete loyalty transactions associated with this order
            await tx.loyaltyTransaction.deleteMany({ where: { orderId: id } })

            // 6. Finally, delete the order
            await tx.order.delete({ where: { id } })
        })

        revalidatePath('/orders')
        revalidatePath('/orders/live')
        revalidatePath('/orders/history')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete order:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete order" }
    }
}

