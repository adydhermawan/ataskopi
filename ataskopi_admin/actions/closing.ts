"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { startOfDay, endOfDay, addDays } from "date-fns"

export async function getDraftClosing(outletId: string, targetDateStr: string) {
    const user = await requirePermission('finance', 'view')
    if (user.role === 'kasir' && user.outletId && user.outletId !== outletId) {
        throw new Error("Unauthorized")
    }

    // Use +07:00 to force Indonesia time (WIB), avoiding Node server UTC offsets
    const endDate = new Date(targetDateStr + "T23:59:59+07:00")

    // 1. Find previous closing
    const lastClosing = await db.closing.findFirst({
        where: { outletId, status: "COMPLETED" },
        orderBy: { endDate: 'desc' },
        include: { balances: true }
    })

    const outlet = await db.outlet.findUnique({ where: { id: outletId } })
    if (!outlet) throw new Error("Outlet not found")

    let startDate: Date
    let openingCash = 0
    let openingQris = 0

    if (lastClosing) {
        // Start from exactly 1 ms after the last closing ended
        startDate = new Date(lastClosing.endDate.getTime() + 1)
        
        const cashBal = lastClosing.balances.find(b => b.paymentMethod === 'CASH')
        if (cashBal) openingCash = Number(cashBal.actualAmount)
        
        const qrisBal = lastClosing.balances.find(b => b.paymentMethod === 'QRIS')
        if (qrisBal) openingQris = Number(qrisBal.actualAmount)
    } else {
        // No previous closing, start from the first daily real revenue transaction
        const firstRev = await db.dailyRealRevenue.findFirst({
            where: { outletId },
            orderBy: { date: 'asc' }
        })
        if (firstRev) {
            const firstDateStr = firstRev.date.toISOString().split('T')[0]
            startDate = new Date(firstDateStr + "T00:00:00+07:00")
        } else {
            const thirtyDaysAgo = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
            const thirtyDateStr = thirtyDaysAgo.toISOString().split('T')[0]
            startDate = new Date(thirtyDateStr + "T00:00:00+07:00")
        }
        openingCash = Number(outlet.modalAwal)
        openingQris = 0
    }

    // Ensure we don't calculate if endDate is before startDate
    if (endDate < startDate) {
        throw new Error("Tanggal tutup buku tidak boleh lebih awal dari tutup buku sebelumnya.")
    }

    // 2. Aggregate Sales & Purchases from DailyRealRevenue to match Net Profit Dashboard
    const revenues = await db.dailyRealRevenue.findMany({
        where: {
            outletId,
            date: { gte: startDate, lte: endDate }
        }
    })

    let cashSales = 0
    let qrisSales = 0

    for (const rev of revenues) {
        // Omset Cash Kotor dari DailyRealRevenue agar klop dengan Net Profit
        cashSales += Number(rev.cashAmount) + Number(rev.cashPurchases)
        qrisSales += Number(rev.qrisAmount)
    }

    // 3. Aggregate Purchases (Cash Out) from actual InventoryPurchases & Expenses
    const purchases = await db.inventoryPurchase.findMany({
        where: {
            outletId,
            date: { gte: startDate, lte: endDate },
            paymentStatus: 'PAID', // Only deduct PAID purchases (includes CASH and PAYLATER)
        },
        select: { totalAmount: true }
    })

    const expenses = await db.expense.findMany({
        where: {
            outletId,
            date: { gte: startDate, lte: endDate }
        },
        select: { amount: true }
    })

    let cashPurchases = 0
    for (const p of purchases) {
        cashPurchases += Number(p.totalAmount)
    }
    for (const e of expenses) {
        cashPurchases += Number(e.amount)
    }

    // 4. Calculate Expected
    const expectedCash = openingCash + cashSales - cashPurchases
    const expectedQris = openingQris + qrisSales

    return {
        startDate,
        endDate,
        openingCash,
        openingQris,
        cashSales,
        qrisSales,
        cashPurchases,
        expectedCash,
        expectedQris
    }
}

export async function submitClosing(data: {
    outletId: string,
    startDate: Date,
    endDate: Date,
    notes?: string,
    balances: {
        paymentMethod: string,
        systemAmount: number,
        actualAmount: number,
        notes?: string
    }[]
}) {
    const user = await requirePermission('finance', 'create')
    
    const closing = await db.closing.create({
        data: {
            outletId: data.outletId,
            startDate: data.startDate,
            endDate: data.endDate,
            status: "COMPLETED",
            notes: data.notes,
            closedBy: user.name,
            balances: {
                create: data.balances.map(b => ({
                    paymentMethod: b.paymentMethod,
                    systemAmount: b.systemAmount,
                    actualAmount: b.actualAmount,
                    varianceAmount: b.actualAmount - b.systemAmount,
                    notes: b.notes
                }))
            }
        }
    })

    revalidatePath('/(dashboard)/finance/closing', 'page')
    return closing
}

export async function getClosings(outletId: string) {
    await requirePermission('finance', 'view')
    return db.closing.findMany({
        where: { outletId },
        orderBy: { endDate: 'desc' },
        include: { balances: true }
    })
}
