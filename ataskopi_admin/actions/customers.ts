'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export async function getCustomers() {
    await requirePermission('customers', 'view')
    const customers = await prisma.user.findMany({
        where: {
            role: 'customer'
        },
        include: {
            orders: {
                select: {
                    id: true,
                    total: true,
                    createdAt: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 5
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return customers.map(customer => ({
        ...customer,
        totalSpent: customer.totalSpent.toNumber(),
        orders: customer.orders.map(order => ({
            ...order,
            total: order.total.toNumber()
        }))
    }))
}

export async function updateCustomer(id: string, data: any) {
    await requirePermission('customers', 'update')
    try {
        await prisma.user.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone
            }
        })
        revalidatePath('/customers')
        return { success: true }
    } catch (error) {
        console.error("Failed to update customer:", error)
        return { success: false, error: "Failed to update customer" }
    }
}
