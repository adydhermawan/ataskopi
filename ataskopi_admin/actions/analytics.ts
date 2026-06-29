'use server'

import { db as prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth-utils"

/**
 * Calculate depreciation for a single asset within a date range.
 * Depreciation is counted per month the asset is active within its useful life.
 */
function calculateAssetDepreciation(
    asset: { purchaseDate: Date; purchasePrice: any; usefulLifeMonths: number; monthlyDepreciation: any },
    startDate: Date,
    endDate: Date
): number {
    const monthlyDep = Number(asset.monthlyDepreciation)
    if (monthlyDep <= 0) return 0

    const purchaseDate = new Date(asset.purchaseDate)
    // End of useful life
    const depEndDate = new Date(purchaseDate)
    depEndDate.setMonth(depEndDate.getMonth() + asset.usefulLifeMonths)

    // Effective range: overlap between [startDate, endDate] and [purchaseDate, depEndDate]
    const effectiveStart = new Date(Math.max(startDate.getTime(), purchaseDate.getTime()))
    const effectiveEnd = new Date(Math.min(endDate.getTime(), depEndDate.getTime()))

    if (effectiveStart > effectiveEnd) return 0

    // Count months in the effective range
    const startMonth = effectiveStart.getFullYear() * 12 + effectiveStart.getMonth()
    const endMonth = effectiveEnd.getFullYear() * 12 + effectiveEnd.getMonth()
    const monthsCount = endMonth - startMonth + 1

    return monthlyDep * Math.max(0, monthsCount)
}

/**
 * Calculate accumulated depreciation from purchase date up to a given date.
 */
function calculateAccumulatedDepreciation(
    asset: { purchaseDate: Date; purchasePrice: any; usefulLifeMonths: number; monthlyDepreciation: any },
    asOfDate: Date
): number {
    const monthlyDep = Number(asset.monthlyDepreciation)
    if (monthlyDep <= 0) return 0

    const purchaseDate = new Date(asset.purchaseDate)
    if (asOfDate < purchaseDate) return 0

    const purchaseMonth = purchaseDate.getFullYear() * 12 + purchaseDate.getMonth()
    const asOfMonth = asOfDate.getFullYear() * 12 + asOfDate.getMonth()
    const monthsElapsed = asOfMonth - purchaseMonth + 1

    // Cap at useful life
    const cappedMonths = Math.min(monthsElapsed, asset.usefulLifeMonths)
    const accumulated = monthlyDep * Math.max(0, cappedMonths)

    // Never exceed purchase price
    return Math.min(accumulated, Number(asset.purchasePrice))
}

export async function getNetProfitAnalytics(outletId: string, startDate: Date, endDate: Date) {
    await requirePermission('finance', 'view')
    
    // Get Gross Real Revenue
    const revenues = await prisma.dailyRealRevenue.findMany({
        where: {
            outletId,
            date: { gte: startDate, lte: endDate }
        }
    })
    
    const grossRevenue = revenues.reduce((sum, rev) => sum + Number(rev.grossRevenue > 0 ? rev.grossRevenue : rev.cashAmount), 0)

    // Get COGS from completed StockOpnames in the period
    const stockOpnames = await prisma.stockOpname.findMany({
        where: {
            outletId,
            status: 'COMPLETED',
            date: { gte: startDate, lte: endDate }
        }
    })
    const cogs = stockOpnames.reduce((sum, op) => sum + Number(op.cogsAmount), 0)
    
    // Get Expenses (Operating Expenses — OpEx only, excludes CapEx)
    const expenses = await prisma.expense.findMany({
        where: {
            outletId,
            date: { gte: startDate, lte: endDate }
        }
    })
    
    const opexAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)

    // Calculate depreciation from active assets
    const assets = await prisma.asset.findMany({
        where: {
            outletId,
            status: 'ACTIVE',
            purchaseDate: { lte: endDate }
        }
    })

    const depreciationExpense = assets.reduce((sum, asset) => {
        return sum + calculateAssetDepreciation(asset, startDate, endDate)
    }, 0)

    // Total expenses = OpEx + Depreciation (for P&L accuracy)
    const totalExpenses = opexAmount + depreciationExpense
    const netProfit = grossRevenue - cogs - totalExpenses
    
    return {
        grossRevenue,
        cogs,
        opexAmount,
        depreciationExpense,
        totalExpenses,
        netProfit,
        margin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0,
        expensesByCategory: {
            ...expenses.reduce((acc, exp) => {
                acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount)
                return acc
            }, {} as Record<string, number>),
            ...(depreciationExpense > 0 ? { DEPRECIATION: depreciationExpense } : {})
        }
    }
}

export async function getMonthlyProfitSummary(outletId: string, months: number = 6) {
    await requirePermission('finance', 'view')

    const results: Array<{
        month: string;
        grossRevenue: number;
        cogs: number;
        opexAmount: number;
        depreciationExpense: number;
        totalExpenses: number;
        netProfit: number;
        margin: number;
    }> = []

    const now = new Date()

    // Fetch all assets once for efficiency
    const allAssets = await prisma.asset.findMany({
        where: { outletId, status: 'ACTIVE' }
    })

    for (let i = months - 1; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
        const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)

        const revenues = await prisma.dailyRealRevenue.findMany({
            where: { outletId, date: { gte: startDate, lte: endDate } }
        })
        const stockOpnames = await prisma.stockOpname.findMany({
            where: { outletId, status: 'COMPLETED', date: { gte: startDate, lte: endDate } }
        })
        const expenses = await prisma.expense.findMany({
            where: { outletId, date: { gte: startDate, lte: endDate } }
        })

        const grossRevenue = revenues.reduce((sum, r) => sum + Number(r.grossRevenue > 0 ? r.grossRevenue : r.cashAmount), 0)
        const cogsVal = stockOpnames.reduce((sum, op) => sum + Number(op.cogsAmount), 0)
        const opexAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

        // Calculate depreciation for this month from eligible assets
        const depreciationExpense = allAssets
            .filter(a => new Date(a.purchaseDate) <= endDate)
            .reduce((sum, asset) => sum + calculateAssetDepreciation(asset, startDate, endDate), 0)

        const totalExpenses = opexAmount + depreciationExpense
        const netProfit = grossRevenue - cogsVal - totalExpenses

        results.push({
            month: startDate.toISOString(),
            grossRevenue,
            cogs: cogsVal,
            opexAmount,
            depreciationExpense,
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

    // Fetch stock opnames within the period
    const stockOpnames = await prisma.stockOpname.findMany({
        where: { outletId, status: 'COMPLETED', date: { gte: startDate, lte: endDate } },
        orderBy: { date: 'asc' }
    })

    // Also fetch the LAST completed stock opname BEFORE startDate to determine period boundaries
    const previousOpname = await prisma.stockOpname.findFirst({
        where: { outletId, status: 'COMPLETED', date: { lt: startDate } },
        orderBy: { date: 'desc' }
    })

    const expenses = await prisma.expense.findMany({
        where: { outletId, date: { gte: startDate, lte: endDate } },
        orderBy: { date: 'asc' }
    })

    // Build revenue map by date key (YYYY-MM-DD)
    const revenueMap: Record<string, number> = {}
    revenues.forEach(r => {
        const key = r.date.toISOString().split('T')[0]
        const amt = Number(r.grossRevenue > 0 ? r.grossRevenue : r.cashAmount)
        revenueMap[key] = (revenueMap[key] || 0) + amt
    })

    // Build daily map with revenue and expenses first
    const dailyMap: Record<string, { revenue: number; cogs: number; expenses: number }> = {}

    revenues.forEach(r => {
        const key = r.date.toISOString().split('T')[0]
        const amt = Number(r.grossRevenue > 0 ? r.grossRevenue : r.cashAmount)
        if (!dailyMap[key]) dailyMap[key] = { revenue: 0, cogs: 0, expenses: 0 }
        dailyMap[key].revenue += amt
    })

    expenses.forEach(e => {
        const key = e.date.toISOString().split('T')[0]
        if (!dailyMap[key]) dailyMap[key] = { revenue: 0, cogs: 0, expenses: 0 }
        dailyMap[key].expenses += Number(e.amount)
    })

    // --- Distribute COGS proportionally based on revenue within each stock opname period ---
    // Helper: get all date keys (YYYY-MM-DD) between two dates (inclusive)
    const getDateRange = (from: Date, to: Date): string[] => {
        const dates: string[] = []
        const current = new Date(from)
        current.setHours(0, 0, 0, 0)
        const end = new Date(to)
        end.setHours(0, 0, 0, 0)
        while (current <= end) {
            dates.push(current.toISOString().split('T')[0])
            current.setDate(current.getDate() + 1)
        }
        return dates
    }

    for (let i = 0; i < stockOpnames.length; i++) {
        const opname = stockOpnames[i]
        const cogsAmount = Number(opname.cogsAmount)
        if (cogsAmount <= 0) continue

        // Determine period start:
        // - If there's a previous opname (either earlier in this list or the one before startDate),
        //   period starts the day AFTER that previous opname
        // - Otherwise, period starts at startDate
        let periodStart: Date
        if (i > 0) {
            // Previous opname is within this month
            periodStart = new Date(stockOpnames[i - 1].date)
            periodStart.setDate(periodStart.getDate() + 1)
        } else if (previousOpname) {
            // Previous opname is before this month
            periodStart = new Date(previousOpname.date)
            periodStart.setDate(periodStart.getDate() + 1)
            // Clamp to startDate if the previous opname is too old
            if (periodStart < startDate) {
                periodStart = new Date(startDate)
            }
        } else {
            periodStart = new Date(startDate)
        }

        const periodEnd = new Date(opname.date)
        const periodDays = getDateRange(periodStart, periodEnd)

        // Calculate total revenue in this period
        const totalRevenuePeriod = periodDays.reduce((sum, day) => sum + (revenueMap[day] || 0), 0)

        // Distribute COGS
        for (const day of periodDays) {
            if (!dailyMap[day]) dailyMap[day] = { revenue: 0, cogs: 0, expenses: 0 }

            if (totalRevenuePeriod > 0) {
                // Proportional distribution based on revenue share
                const dayRevenue = revenueMap[day] || 0
                dailyMap[day].cogs += (dayRevenue / totalRevenuePeriod) * cogsAmount
            } else {
                // Equal distribution if no revenue in period
                dailyMap[day].cogs += cogsAmount / periodDays.length
            }
        }
    }

    return Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
            date,
            revenue: data.revenue,
            cogs: Math.round(data.cogs),
            expenses: data.expenses,
            netProfit: data.revenue - Math.round(data.cogs) - data.expenses,
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

    const stockOpnames = await prisma.stockOpname.findMany({
        where: { outletId, status: 'COMPLETED', date: { gte: oldestAssetDate } }
    })
    
    const expenses = await prisma.expense.findMany({
        where: { outletId, date: { gte: oldestAssetDate } }
    })

    const now = new Date()
    
    const roiData = assets.map(asset => {
        const revSince = revenues.filter(r => r.date >= asset.purchaseDate).reduce((s, r) => s + Number(r.grossRevenue > 0 ? r.grossRevenue : r.cashAmount), 0)
        const cogsSince = stockOpnames.filter(op => op.date >= asset.purchaseDate).reduce((s, op) => s + Number(op.cogsAmount), 0)
        const expSince = expenses.filter(e => e.date >= asset.purchaseDate).reduce((s, e) => s + Number(e.amount), 0)
        
        const netProfitSince = revSince - cogsSince - expSince
        const roiPercentage = Number(asset.purchasePrice) > 0 ? (netProfitSince / Number(asset.purchasePrice)) * 100 : 0

        // Depreciation tracking
        const accumulatedDepreciation = calculateAccumulatedDepreciation(asset, now)
        const bookValue = Math.max(0, Number(asset.purchasePrice) - accumulatedDepreciation)

        return {
            ...asset,
            purchasePrice: Number(asset.purchasePrice),
            monthlyDepreciation: Number(asset.monthlyDepreciation),
            usefulLifeMonths: asset.usefulLifeMonths,
            accumulatedDepreciation,
            bookValue,
            netProfitSince,
            roiPercentage: Math.max(0, roiPercentage)
        }
    })
    
    return roiData
}
