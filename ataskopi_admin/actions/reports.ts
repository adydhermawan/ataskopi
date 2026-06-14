'use server'

import { db as prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth-utils"

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

    const cappedMonths = Math.min(monthsElapsed, asset.usefulLifeMonths)
    const accumulated = monthlyDep * Math.max(0, cappedMonths)

    return Math.min(accumulated, Number(asset.purchasePrice))
}

/**
 * Calculate depreciation within a date range for a single asset.
 */
function calculateAssetDepreciation(
    asset: { purchaseDate: Date; purchasePrice: any; usefulLifeMonths: number; monthlyDepreciation: any },
    startDate: Date,
    endDate: Date
): number {
    const monthlyDep = Number(asset.monthlyDepreciation)
    if (monthlyDep <= 0) return 0

    const purchaseDate = new Date(asset.purchaseDate)
    const depEndDate = new Date(purchaseDate)
    depEndDate.setMonth(depEndDate.getMonth() + asset.usefulLifeMonths)

    const effectiveStart = new Date(Math.max(startDate.getTime(), purchaseDate.getTime()))
    const effectiveEnd = new Date(Math.min(endDate.getTime(), depEndDate.getTime()))

    if (effectiveStart > effectiveEnd) return 0

    const startMonth = effectiveStart.getFullYear() * 12 + effectiveStart.getMonth()
    const endMonth = effectiveEnd.getFullYear() * 12 + effectiveEnd.getMonth()
    const monthsCount = endMonth - startMonth + 1

    return monthlyDep * Math.max(0, monthsCount)
}

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

    // 3. Operating Expenses from Expense (OpEx only, no CapEx)
    const expenses = await prisma.expense.findMany({
        where: {
            outletId,
            date: { gte: startDate, lte: endDate }
        }
    })
    const opexAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

    // 4. Depreciation from active assets
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

    const totalExpenses = opexAmount + depreciationExpense
    const grossProfit = totalRevenue - totalCogs
    const netProfit = grossProfit - totalExpenses

    // Expenses categorized for breakdown (including depreciation)
    const expensesByCategory = expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount)
        return acc
    }, {} as Record<string, number>)

    if (depreciationExpense > 0) {
        expensesByCategory['DEPRECIATION'] = depreciationExpense
    }

    return {
        totalRevenue,
        totalCogs,
        grossProfit,
        opexAmount,
        depreciationExpense,
        totalExpenses,
        netProfit,
        expensesByCategory
    }
}

export async function getBalanceSheet(outletId: string, asOfDate: Date) {
    await requirePermission('finance', 'view')

    // 0. Get Outlet settings (initial capital)
    const outlet = await prisma.outlet.findUnique({
        where: { id: outletId }
    })
    const modalAwal = outlet ? Number(outlet.modalAwal) : 0

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

    // 1.5. In-Transit Inventory (barang yang masih SHIPPING, belum diterima)
    const inTransitPurchases = await prisma.inventoryPurchase.findMany({
        where: {
            outletId,
            deliveryStatus: 'SHIPPING',
            date: { lte: asOfDate }
        }
    })
    const inTransitInventoryValue = inTransitPurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)
    const inTransitCount = inTransitPurchases.length

    // 2. Fixed Assets with Net Book Value (purchasePrice - accumulatedDepreciation)
    const fixedAssets = await prisma.asset.findMany({
        where: {
            outletId,
            status: 'ACTIVE',
            purchaseDate: { lte: asOfDate }
        }
    })
    const fixedAssetsDetails = fixedAssets.map(a => {
        const accDep = calculateAccumulatedDepreciation(a, asOfDate)
        return {
            id: a.id,
            name: a.name,
            purchasePrice: Number(a.purchasePrice),
            purchaseDate: a.purchaseDate,
            usefulLifeMonths: a.usefulLifeMonths,
            monthlyDepreciation: Number(a.monthlyDepreciation),
            accumulatedDepreciation: accDep,
            bookValue: Math.max(0, Number(a.purchasePrice) - accDep)
        }
    })
    // Total fixed assets = Sum of Net Book Values
    const fixedAssetsValue = fixedAssetsDetails.reduce((sum, a) => sum + a.bookValue, 0)
    const fixedAssetsCostValue = fixedAssetsDetails.reduce((sum, a) => sum + a.purchasePrice, 0)
    const totalAccumulatedDepreciation = fixedAssetsDetails.reduce((sum, a) => sum + a.accumulatedDepreciation, 0)

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

    // Retained earnings now include depreciation as expense (not CapEx as lump sum)
    const retainedEarnings = cumulativeRevenue - cumulativeCogs - cumulativeExpenses - totalAccumulatedDepreciation

    // 4. Total Purchases (all purchases, both paid and unpaid)
    const allPurchases = await prisma.inventoryPurchase.findMany({
        where: {
            outletId,
            date: { lte: asOfDate }
        }
    })
    const totalPurchases = allPurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)

    // 4.1. Only PAID purchases count as real cash outflow
    const paidPurchases = allPurchases.filter(p => p.paymentStatus === 'PAID')
    const totalPaidPurchases = paidPurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)

    // 4.2. Accounts Payable (Utang Dagang) — UNPAID + OVERDUE purchases
    const unpaidPurchases = allPurchases.filter(p => p.paymentStatus === 'UNPAID' || p.paymentStatus === 'OVERDUE')
    const accountsPayable = unpaidPurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)
    const accountsPayableCount = unpaidPurchases.length

    // 4.5. Deteksi Modal Barang (stok awal yang diinput tanpa transaksi pembelian)
    // Jika Total Persediaan saat ini + COGS > Total Pembelian Tercatat, selisihnya adalah barang modal awal.
    const unrecordedInitialInventory = Math.max(0, inventoryValue + cumulativeCogs - totalPurchases)
    const virtualTotalPurchases = totalPaidPurchases + unrecordedInitialInventory

    // 5. Saldo Kas = Modal Awal + Total Pendapatan Kotor - Total Pengeluaran Riil (KAS saja)
    // Total Pengeluaran Riil = virtualTotalPurchases (Bahan Baku PAID) + cumulativeExpenses (OpEx) + fixedAssetsCostValue (CapEx)
    const cash = modalAwal + cumulativeRevenue - (virtualTotalPurchases + cumulativeExpenses + fixedAssetsCostValue)

    const totalAssets = cash + inventoryValue + inTransitInventoryValue + fixedAssetsValue

    return {
        asOfDate,
        cash,
        inventory: {
            details: materialsDetails,
            totalValue: inventoryValue
        },
        inTransitInventory: {
            totalValue: inTransitInventoryValue,
            count: inTransitCount,
        },
        fixedAssets: {
            details: fixedAssetsDetails,
            totalValue: fixedAssetsValue,
            costValue: fixedAssetsCostValue,
            totalAccumulatedDepreciation
        },
        totalAssets,
        accountsPayable,
        accountsPayableCount,
        equity: {
            initialCapital: modalAwal,
            retainedEarnings,
            totalPurchases
        }
    }
}

