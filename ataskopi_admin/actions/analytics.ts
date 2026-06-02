'use server'

import { db as prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth-utils"

export async function getNetProfitAnalytics(outletId: string, startDate: Date, endDate: Date) {
    await requirePermission('finance', 'view')
    
    // Get Gross Real Revenue
    const revenues = await prisma.dailyRealRevenue.findMany({
        where: {
            outletId,
            date: { gte: startDate, lte: endDate }
        }
    })
    
    const grossRevenue = revenues.reduce((sum, rev) => sum + Number(rev.amount), 0)
    
    // Get Expenses
    const expenses = await prisma.expense.findMany({
        where: {
            outletId,
            date: { gte: startDate, lte: endDate }
        }
    })
    
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
    
    const netProfit = grossRevenue - totalExpenses
    
    return {
        grossRevenue,
        totalExpenses,
        netProfit,
        margin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0,
        expensesByCategory: expenses.reduce((acc, exp) => {
            acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount)
            return acc
        }, {} as Record<string, number>)
    }
}

export async function getMonthlyProfitSummary(outletId: string, months: number = 6) {
    await requirePermission('finance', 'view')

    const results: Array<{
        month: string;
        grossRevenue: number;
        totalExpenses: number;
        netProfit: number;
        margin: number;
    }> = []

    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
        const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)

        const revenues = await prisma.dailyRealRevenue.findMany({
            where: { outletId, date: { gte: startDate, lte: endDate } }
        })
        const expenses = await prisma.expense.findMany({
            where: { outletId, date: { gte: startDate, lte: endDate } }
        })

        const grossRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0)
        const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
        const netProfit = grossRevenue - totalExpenses

        results.push({
            month: startDate.toISOString(),
            grossRevenue,
            totalExpenses,
            netProfit,
            margin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0,
        })
    }

    return results
}

export async function getDailyProfitTrend(outletId: string, startDate: Date, endDate: Date) {
    await requirePermission('finance', 'view')

    const revenues = await prisma.dailyRealRevenue.findMany({
        where: { outletId, date: { gte: startDate, lte: endDate } },
        orderBy: { date: 'asc' }
    })

    const expenses = await prisma.expense.findMany({
        where: { outletId, date: { gte: startDate, lte: endDate } },
        orderBy: { date: 'asc' }
    })

    // Group by date
    const dailyMap: Record<string, { revenue: number; expenses: number }> = {}

    revenues.forEach(r => {
        const key = r.date.toISOString().split('T')[0]
        if (!dailyMap[key]) dailyMap[key] = { revenue: 0, expenses: 0 }
        dailyMap[key].revenue += Number(r.amount)
    })

    expenses.forEach(e => {
        const key = e.date.toISOString().split('T')[0]
        if (!dailyMap[key]) dailyMap[key] = { revenue: 0, expenses: 0 }
        dailyMap[key].expenses += Number(e.amount)
    })

    return Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
            date,
            revenue: data.revenue,
            expenses: data.expenses,
            netProfit: data.revenue - data.expenses,
        }))
}

export async function getAssetsROI(outletId: string) {
    await requirePermission('finance', 'view')
    
    const assets = await prisma.asset.findMany({
        where: { outletId, status: 'ACTIVE' },
        orderBy: { purchaseDate: 'asc' }
    })
    
    if (assets.length === 0) return []
    
    const oldestAssetDate = assets[0].purchaseDate
    
    const revenues = await prisma.dailyRealRevenue.findMany({
        where: { outletId, date: { gte: oldestAssetDate } }
    })
    
    const expenses = await prisma.expense.findMany({
        where: { outletId, date: { gte: oldestAssetDate } }
    })
    
    const roiData = assets.map(asset => {
        const revSince = revenues.filter(r => r.date >= asset.purchaseDate).reduce((s, r) => s + Number(r.amount), 0)
        const expSince = expenses.filter(e => e.date >= asset.purchaseDate).reduce((s, e) => s + Number(e.amount), 0)
        
        const netProfitSince = revSince - expSince
        const roiPercentage = Number(asset.purchasePrice) > 0 ? (netProfitSince / Number(asset.purchasePrice)) * 100 : 0
        
        return {
            ...asset,
            netProfitSince,
            roiPercentage: Math.max(0, roiPercentage)
        }
    })
    
    return roiData
}
