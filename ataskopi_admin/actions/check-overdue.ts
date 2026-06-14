'use server'

import { db as prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth-utils"

/**
 * Check and update overdue paylater purchases.
 * Called lazily when user opens the purchases page — no cron needed for UMKM.
 */
export async function checkAndUpdateOverdue(outletId: string) {
    await requirePermission('inventory', 'view')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find all UNPAID purchases with dueDate < today
    const overduePurchases = await prisma.inventoryPurchase.findMany({
        where: {
            outletId,
            paymentStatus: 'UNPAID',
            dueDate: {
                lt: today,
            }
        },
        select: { id: true }
    })

    if (overduePurchases.length === 0) return { updated: 0 }

    // Batch update to OVERDUE
    const result = await prisma.inventoryPurchase.updateMany({
        where: {
            id: { in: overduePurchases.map(p => p.id) }
        },
        data: {
            paymentStatus: 'OVERDUE'
        }
    })

    return { updated: result.count }
}
