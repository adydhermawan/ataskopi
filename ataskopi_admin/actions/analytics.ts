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
        expensesByCategory: expenses.reduce((acc, exp) => {
            acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount)
            return acc
        }, {} as Record<string, number>)
    }
}

export async function getAssetsROI(outletId: string) {
    await requirePermission('finance', 'view')
    
    const assets = await prisma.asset.findMany({
        where: { outletId, status: 'ACTIVE' },
        orderBy: { purchaseDate: 'asc' }
    })
    
    if (assets.length === 0) return []
    
    // Calculate total net profit since the oldest asset was purchased
    const oldestAssetDate = assets[0].purchaseDate
    
    const revenues = await prisma.dailyRealRevenue.findMany({
        where: { outletId, date: { gte: oldestAssetDate } }
    })
    
    const expenses = await prisma.expense.findMany({
        where: { outletId, date: { gte: oldestAssetDate } }
    })
    
    const totalNetProfit = revenues.reduce((sum, r) => sum + Number(r.amount), 0) - 
                           expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    
    // Distribute ROI
    // Note: For simplicity, we compare total net profit against each asset's cost, 
    // or we can calculate accumulated net profit since each asset's purchase date.
    // Let's do accumulated net profit since each asset's purchase date.
    
    const roiData = assets.map(asset => {
        const revSince = revenues.filter(r => r.date >= asset.purchaseDate).reduce((s, r) => s + Number(r.amount), 0)
        const expSince = expenses.filter(e => e.date >= asset.purchaseDate).reduce((s, e) => s + Number(e.amount), 0)
        
        const netProfitSince = revSince - expSince
        const roiPercentage = Number(asset.purchasePrice) > 0 ? (netProfitSince / Number(asset.purchasePrice)) * 100 : 0
        
        return {
            ...asset,
            netProfitSince,
            roiPercentage: Math.max(0, roiPercentage) // Floor at 0 if profit is negative
        }
    })
    
    return roiData
}
