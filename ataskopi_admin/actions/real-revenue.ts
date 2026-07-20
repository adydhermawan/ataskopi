'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"
import { saveRealRevenueSchema } from "@/lib/validation/real-revenue-schemas"
import { startOfDay, endOfDay, format } from "date-fns"

/**
 * Fetch cash purchases (CASH + PAID) from InventoryPurchase for a specific date and outlet.
 * This represents the amount of cash used for material purchases on that day.
 */
async function getCashPurchasesForDate(outletId: string, date: Date): Promise<number> {
    const dateKey = new Date(format(date, "yyyy-MM-dd") + "T00:00:00Z")
    const purchases = await prisma.inventoryPurchase.findMany({
        where: {
            outletId,
            paymentMethod: 'CASH',
            paymentStatus: 'PAID',
            AND: [
                {
                    OR: [
                        { paymentSource: { in: ['Cash', 'CASH', ''] } },
                        { paymentSource: null }
                    ]
                },
                {
                    OR: [
                        { omzetDate: dateKey },
                        { omzetDate: null, date: dateKey }
                    ]
                }
            ]
        }
    })
    return purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)
}

/**
 * Fetch cash purchase items list (CASH + PAID) from InventoryPurchase for a specific date and outlet.
 */
async function getCashPurchasesListForDate(outletId: string, date: Date) {
    const dateKey = new Date(format(date, "yyyy-MM-dd") + "T00:00:00Z")
    const purchases = await prisma.inventoryPurchase.findMany({
        where: {
            outletId,
            paymentMethod: 'CASH',
            paymentStatus: 'PAID',
            AND: [
                {
                    OR: [
                        { paymentSource: { in: ['Cash', 'CASH', ''] } },
                        { paymentSource: null }
                    ]
                },
                {
                    OR: [
                        { omzetDate: dateKey },
                        { omzetDate: null, date: dateKey }
                    ]
                }
            ]
        },
        include: {
            rawMaterial: {
                select: {
                    id: true,
                    name: true,
                    unit: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return purchases.map(p => ({
        id: p.id,
        rawMaterialId: p.rawMaterialId,
        rawMaterialName: p.rawMaterial.name,
        unit: p.rawMaterial.unit,
        quantity: Number(p.quantity),
        unitPrice: Number(p.unitPrice),
        totalAmount: Number(p.totalAmount),
        supplier: p.supplier,
        notes: p.notes,
        createdAt: p.createdAt.toISOString()
    }))
}

/**
 * Fetch web revenue (completed orders) for a specific date and outlet.
 */
async function getWebRevenueForDate(outletId: string, date: Date): Promise<number> {
    const start = startOfDay(date)
    const end = endOfDay(date)

    const orders = await prisma.order.findMany({
        where: {
            outletId,
            createdAt: { gte: start, lte: end },
            orderStatus: 'completed',
        },
        select: { total: true }
    })
    return orders.reduce((sum, o) => sum + Number(o.total), 0)
}

export async function getDailyRealRevenues(outletId?: string | null, days: number = 30) {
    const user = await requirePermission('real_revenue', 'view')

    const where: any = {}

    // Lock cashier to their assigned outlet
    if (user.role === 'kasir') {
        if (user.outletId) {
            where.outletId = user.outletId
        } else {
            return [] // Kasir with no outlet assigned has no access to logs
        }
    } else if (outletId) {
        where.outletId = outletId
    }

    const records = await prisma.dailyRealRevenue.findMany({
        where,
        include: {
            outlet: true
        },
        orderBy: {
            date: 'desc'
        },
        take: days
    })

    return records.map(r => ({
        id: r.id,
        date: r.date.toISOString().split('T')[0], // yyyy-mm-dd format
        outletId: r.outletId,
        outletName: r.outlet.name,
        cashAmount: Number(r.cashAmount),
        qrisAmount: Number(r.qrisAmount),
        otherAmount: Number(r.otherAmount),
        otherMethodName: r.otherMethodName,
        totalAmount: Number(Number(r.totalAmount) > 0 ? r.totalAmount : r.cashAmount),
        grossRevenue: Number(Number(r.grossRevenue) > 0 ? r.grossRevenue : r.cashAmount),
        cashPurchases: Number(r.cashPurchases),
        webRevenue: Number(r.webRevenue),
        isClosed: r.isClosed,
        notes: r.notes,
        createdAt: r.createdAt.toISOString()
    }))
}

export async function saveDailyRealRevenue(rawData: any) {
    const user = await requirePermission('real_revenue', 'create')

    const validation = saveRealRevenueSchema.safeParse(rawData)
    if (!validation.success) {
        return { success: false, error: validation.error.issues[0].message }
    }

    const { id, date, outletId, cashAmount, qrisAmount, otherAmount, otherMethodName, notes } = validation.data

    // If kasir, ensure they can only log for their assigned outlet
    if (user.role === 'kasir' && user.outletId !== outletId) {
        return { success: false, error: "Unauthorized: You can only record revenue for your assigned outlet." }
    }

    const dateKey = new Date(date + "T00:00:00Z")
    const dateObj = new Date(date)

    // Auto-fetch reference data
    const cashPurchases = await getCashPurchasesForDate(outletId, dateObj)
    const webRevenue = await getWebRevenueForDate(outletId, dateObj)

    // Compute totals
    const totalAmount = cashAmount + qrisAmount + (otherAmount || 0)
    const grossRevenue = totalAmount + cashPurchases

    try {
        if (id) {
            // Check if record is closed (only admin/owner can edit closed records)
            const existing = await prisma.dailyRealRevenue.findUnique({ where: { id } })
            if (existing?.isClosed && user.role === 'kasir') {
                return { success: false, error: "Catatan kas hari ini sudah ditutup. Hubungi admin untuk mengedit." }
            }

            // Edit existing entry
            await prisma.dailyRealRevenue.update({
                where: { id },
                data: {
                    date: dateKey,
                    outletId,
                    cashAmount,
                    qrisAmount,
                    otherAmount: otherAmount || 0,
                    otherMethodName: otherMethodName || null,
                    totalAmount,
                    grossRevenue,
                    cashPurchases,
                    webRevenue,
                    notes: notes || null
                }
            })
        } else {
            // Upsert / Create new entry
            await prisma.dailyRealRevenue.upsert({
                where: {
                    date_outletId: {
                        date: dateKey,
                        outletId
                    }
                },
                create: {
                    date: dateKey,
                    outletId,
                    cashAmount,
                    qrisAmount,
                    otherAmount: otherAmount || 0,
                    otherMethodName: otherMethodName || null,
                    totalAmount,
                    grossRevenue,
                    cashPurchases,
                    webRevenue,
                    notes: notes || null
                },
                update: {
                    cashAmount,
                    qrisAmount,
                    otherAmount: otherAmount || 0,
                    otherMethodName: otherMethodName || null,
                    totalAmount,
                    grossRevenue,
                    cashPurchases,
                    webRevenue,
                    notes: notes || null
                }
            })
        }

        revalidatePath('/dashboard')
        revalidatePath('/finance/daily-cash')
        revalidatePath('/finance/cash-flow')
        revalidatePath('/finance/profit')
        return { success: true }
    } catch (error) {
        console.error("Failed to save daily real revenue:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to save daily real revenue" }
    }
}

export async function deleteDailyRealRevenue(id: string) {
    await requirePermission('real_revenue', 'delete')

    try {
        await prisma.dailyRealRevenue.delete({
            where: { id }
        })
        revalidatePath('/dashboard')
        revalidatePath('/finance/daily-cash')
        revalidatePath('/finance/cash-flow')
        revalidatePath('/finance/profit')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete daily real revenue:", error)
        return { success: false, error: "Failed to delete daily real revenue" }
    }
}

/**
 * Toggle closing status of a daily cash record.
 * Only admin/owner can close/reopen.
 */
export async function toggleDailyCashClose(id: string) {
    await requirePermission('real_revenue', 'update')

    try {
        const record = await prisma.dailyRealRevenue.findUnique({ where: { id } })
        if (!record) {
            return { success: false, error: "Record not found" }
        }

        await prisma.dailyRealRevenue.update({
            where: { id },
            data: { isClosed: !record.isClosed }
        })

        revalidatePath('/finance/daily-cash')
        return { success: true, isClosed: !record.isClosed }
    } catch (error) {
        console.error("Failed to toggle close status:", error)
        return { success: false, error: "Failed to toggle close status" }
    }
}

/**
 * Get reference data for a specific date and outlet (used by the form).
 * Returns cash purchases and web revenue without saving anything.
 */
export async function getDailyCashReference(outletId: string, date: string) {
    await requirePermission('real_revenue', 'view')

    const dateObj = new Date(date)
    const [cashPurchases, webRevenue, purchasesList] = await Promise.all([
        getCashPurchasesForDate(outletId, dateObj),
        getWebRevenueForDate(outletId, dateObj),
        getCashPurchasesListForDate(outletId, dateObj),
    ])

    return { cashPurchases, webRevenue, purchasesList }
}
