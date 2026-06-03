'use server'

import { db as prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth-utils"

export async function getIncomeStatement(outletId: string, startDate: Date, endDate: Date) {
    await requirePermission('finance', 'view')

    // 1. Revenue from DailyRealRevenue
    const revenues = await prisma.dailyRealRevenue.findMany({
        where: {
            outletId,
            date: { gte: startDate, lte: endDate }
        }
    })
    const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0)

    // 2. COGS from completed StockOpnames in the period
    const stockOpnames = await prisma.stockOpname.findMany({
        where: {
            outletId,
            status: 'COMPLETED',
            date: { gte: startDate, lte: endDate }
        }
    })
    const totalCogs = stockOpnames.reduce((sum, op) => sum + Number(op.cogsAmount), 0)

    // 3. Operating Expenses from Expense
    const expenses = await prisma.expense.findMany({
        where: {
            outletId,
            date: { gte: startDate, lte: endDate }
        }
    })
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

    const grossProfit = totalRevenue - totalCogs
    const netProfit = grossProfit - totalExpenses

    // Expenses categorized for breakdown
    const expensesByCategory = expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount)
        return acc
    }, {} as Record<string, number>)

    return {
        totalRevenue,
        totalCogs,
        grossProfit,
        totalExpenses,
        netProfit,
        expensesByCategory
    }
}

export async function getBalanceSheet(outletId: string, asOfDate: Date) {
    await requirePermission('finance', 'view')

    // 1. Inventory Value (currentStock * averageCost)
    const rawMaterials = await prisma.rawMaterial.findMany({
        where: { outletId }
    })
    const materialsDetails = rawMaterials.map(m => ({
        id: m.id,
        name: m.name,
        unit: m.unit,
        currentStock: Number(m.currentStock),
        averageCost: Number(m.averageCost),
        totalValue: Number(m.currentStock) * Number(m.averageCost)
    }))
    const inventoryValue = materialsDetails.reduce((sum, m) => sum + m.totalValue, 0)

    // 2. Fixed Assets from Asset table
    const fixedAssets = await prisma.asset.findMany({
        where: {
            outletId,
            status: 'ACTIVE',
            purchaseDate: { lte: asOfDate }
        }
    })
    const fixedAssetsDetails = fixedAssets.map(a => ({
        id: a.id,
        name: a.name,
        purchasePrice: Number(a.purchasePrice),
        purchaseDate: a.purchaseDate
    }))
    const fixedAssetsValue = fixedAssetsDetails.reduce((sum, a) => sum + a.purchasePrice, 0)

    const totalAssets = inventoryValue + fixedAssetsValue

    // 3. Retained Earnings (Accumulated Profit/Loss since inception up to asOfDate)
    const allRevenues = await prisma.dailyRealRevenue.findMany({
        where: {
            outletId,
            date: { lte: asOfDate }
        }
    })
    const cumulativeRevenue = allRevenues.reduce((sum, r) => sum + Number(r.amount), 0)

    const allCogs = await prisma.stockOpname.findMany({
        where: {
            outletId,
            status: 'COMPLETED',
            date: { lte: asOfDate }
        }
    })
    const cumulativeCogs = allCogs.reduce((sum, op) => sum + Number(op.cogsAmount), 0)

    const allExpenses = await prisma.expense.findMany({
        where: {
            outletId,
            date: { lte: asOfDate }
        }
    })
    const cumulativeExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

    const retainedEarnings = cumulativeRevenue - cumulativeCogs - cumulativeExpenses

    // 4. Total Purchases (cash spent on inventory purchase)
    const allPurchases = await prisma.inventoryPurchase.findMany({
        where: {
            outletId,
            date: { lte: asOfDate }
        }
    })
    const totalPurchases = allPurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)

    return {
        asOfDate,
        inventory: {
            details: materialsDetails,
            totalValue: inventoryValue
        },
        fixedAssets: {
            details: fixedAssetsDetails,
            totalValue: fixedAssetsValue
        },
        totalAssets,
        equity: {
            initialCapital: 10000000, // Default Initial Capital
            retainedEarnings,
            totalPurchases
        }
    }
}
