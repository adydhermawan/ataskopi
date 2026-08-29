'use server'

import { db as prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth-utils"

/**
 * Check and update overdue paylater purchases.
 * Called lazily when user opens the purchases page — no cron needed for UMKM.
 */
export async function checkAndUpdateOverdue(outletId: string) {
    await requirePermission('finance', 'view')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [overduePurchases, overdueExpenses, overdueAssets] = await Promise.all([
        prisma.inventoryPurchase.findMany({
            where: {
                outletId,
                paymentStatus: 'UNPAID',
                dueDate: { lt: today }
            },
            select: { id: true }
        }),
        prisma.expense.findMany({
            where: {
                outletId,
                paymentStatus: 'UNPAID',
                dueDate: { lt: today }
            },
            select: { id: true }
        }),
        prisma.asset.findMany({
            where: {
                outletId,
                paymentStatus: 'UNPAID',
                dueDate: { lt: today }
            },
            select: { id: true }
        }),
    ])

    let totalUpdated = 0

    if (overduePurchases.length > 0) {
        const res = await prisma.inventoryPurchase.updateMany({
            where: { id: { in: overduePurchases.map(p => p.id) } },
            data: { paymentStatus: 'OVERDUE' }
        })
        totalUpdated += res.count
    }

    if (overdueExpenses.length > 0) {
        const res = await prisma.expense.updateMany({
            where: { id: { in: overdueExpenses.map(e => e.id) } },
            data: { paymentStatus: 'OVERDUE' }
        })
        totalUpdated += res.count
    }

    if (overdueAssets.length > 0) {
        const res = await prisma.asset.updateMany({
            where: { id: { in: overdueAssets.map(a => a.id) } },
            data: { paymentStatus: 'OVERDUE' }
        })
        totalUpdated += res.count
    }

    return { updated: totalUpdated }
}
