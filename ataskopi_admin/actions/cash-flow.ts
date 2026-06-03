'use server'

import { db as prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth-utils"

export async function getCashFlowReport(outletId: string, startDate: Date, endDate: Date) {
    await requirePermission('finance', 'view')

    // Cash In: Revenue from DailyRealRevenue
    const revenues = await prisma.dailyRealRevenue.findMany({
        where: {
            outletId,
            date: { gte: startDate, lte: endDate }
        }
    })
    const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0)

    // Cash Out — COGS: Inventory Purchases (actual cash spent on raw materials)
    const purchases = await prisma.inventoryPurchase.findMany({
        where: {
            outletId,
            date: { gte: startDate, lte: endDate }
        }
    })
    const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)

    // Cash Out — OpEx: Operating Expenses
    const expenses = await prisma.expense.findMany({
        where: {
            outletId,
            date: { gte: startDate, lte: endDate }
        }
    })
    const totalOpex = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

    // Cash Out — CapEx: Asset Purchases in the period
    const assets = await prisma.asset.findMany({
        where: {
            outletId,
            purchaseDate: { gte: startDate, lte: endDate }
        }
    })
    const totalCapex = assets.reduce((sum, a) => sum + Number(a.purchasePrice), 0)

    const totalCashOut = totalPurchases + totalOpex + totalCapex
    const netCashFlow = totalRevenue - totalCashOut

    // OpEx by category for breakdown
    const opexByCategory = expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount)
        return acc
    }, {} as Record<string, number>)

    // CapEx detail list
    const capexDetails = assets.map(a => ({
        id: a.id,
        name: a.name,
        purchaseDate: a.purchaseDate,
        amount: Number(a.purchasePrice)
    }))

    return {
        cashIn: {
            revenue: totalRevenue
        },
        cashOut: {
            purchases: totalPurchases,
            opex: totalOpex,
            capex: totalCapex,
            totalCashOut
        },
        netCashFlow,
        opexByCategory,
        capexDetails
    }
}

export async function getMonthlyCashFlowTrend(outletId: string, months: number = 6) {
    await requirePermission('finance', 'view')

    const results: Array<{
        month: string;
        cashIn: number;
        purchases: number;
        opex: number;
        capex: number;
        totalCashOut: number;
        netCashFlow: number;
    }> = []

    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
        const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)

        const revenues = await prisma.dailyRealRevenue.findMany({
            where: { outletId, date: { gte: startDate, lte: endDate } }
        })
        const purchases = await prisma.inventoryPurchase.findMany({
            where: { outletId, date: { gte: startDate, lte: endDate } }
        })
        const expenses = await prisma.expense.findMany({
            where: { outletId, date: { gte: startDate, lte: endDate } }
        })
        const assets = await prisma.asset.findMany({
            where: { outletId, purchaseDate: { gte: startDate, lte: endDate } }
        })

        const cashIn = revenues.reduce((sum, r) => sum + Number(r.amount), 0)
        const purchasesTotal = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)
        const opex = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
        const capex = assets.reduce((sum, a) => sum + Number(a.purchasePrice), 0)
        const totalCashOut = purchasesTotal + opex + capex

        results.push({
            month: startDate.toISOString(),
            cashIn,
            purchases: purchasesTotal,
            opex,
            capex,
            totalCashOut,
            netCashFlow: cashIn - totalCashOut,
        })
    }

    return results
}
