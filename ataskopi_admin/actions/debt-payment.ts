'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export interface UnpaidDebtItem {
    id: string
    type: 'purchase' | 'expense' | 'asset'
    date: Date
    description: string
    category: string
    supplier: string | null
    paymentSource: string | null
    paymentStatus: string
    dueDate: Date | null
    amount: number
    rawMaterialName?: string
}

/**
 * Get all unpaid debts (UNPAID + OVERDUE) from InventoryPurchase, Expense, and Asset
 */
export async function getUnpaidDebts(outletId: string): Promise<UnpaidDebtItem[]> {
    await requirePermission('finance', 'view')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [purchases, expenses, assets] = await Promise.all([
        prisma.inventoryPurchase.findMany({
            where: {
                outletId,
                paymentStatus: { in: ['UNPAID', 'OVERDUE'] },
            },
            include: {
                rawMaterial: {
                    select: { name: true, unit: true }
                }
            },
            orderBy: { date: 'desc' },
        }),
        prisma.expense.findMany({
            where: {
                outletId,
                paymentStatus: { in: ['UNPAID', 'OVERDUE'] },
            },
            orderBy: { date: 'desc' },
        }),
        prisma.asset.findMany({
            where: {
                outletId,
                paymentStatus: { in: ['UNPAID', 'OVERDUE'] },
            },
            orderBy: { purchaseDate: 'desc' },
        }),
    ])

    const purchaseItems: UnpaidDebtItem[] = purchases.map((p) => {
        let status = p.paymentStatus
        if (status === 'UNPAID' && p.dueDate && new Date(p.dueDate) < today) {
            status = 'OVERDUE'
        }
        return {
            id: p.id,
            type: 'purchase' as const,
            date: p.date,
            description: p.notes || `Pembelian ${p.rawMaterial.name}`,
            category: 'PEMBELIAN',
            supplier: p.supplier,
            paymentSource: p.paymentSource,
            paymentStatus: status,
            dueDate: p.dueDate,
            amount: Number(p.totalAmount),
            rawMaterialName: p.rawMaterial.name,
        }
    })

    const expenseItems: UnpaidDebtItem[] = expenses.map((e) => {
        let status = e.paymentStatus
        if (status === 'UNPAID' && e.dueDate && new Date(e.dueDate) < today) {
            status = 'OVERDUE'
        }
        return {
            id: e.id,
            type: 'expense' as const,
            date: e.date,
            description: e.description || e.category,
            category: e.category,
            supplier: null,
            paymentSource: e.paymentSource,
            paymentStatus: status,
            dueDate: e.dueDate,
            amount: Number(e.amount),
        }
    })

    const assetItems: UnpaidDebtItem[] = assets.map((a) => {
        let status = a.paymentStatus
        if (status === 'UNPAID' && a.dueDate && new Date(a.dueDate) < today) {
            status = 'OVERDUE'
        }
        return {
            id: a.id,
            type: 'asset' as const,
            date: a.purchaseDate,
            description: a.notes || `Pembelian Aset: ${a.name}`,
            category: 'CAPEX',
            supplier: null,
            paymentSource: a.paymentSource,
            paymentStatus: status,
            dueDate: a.dueDate,
            amount: Number(a.purchasePrice),
        }
    })

    // Combine and sort by date desc
    const allDebts = [...purchaseItems, ...expenseItems, ...assetItems].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return allDebts
}

/**
 * Get summary of all unpaid debts
 */
export async function getDebtSummary(outletId: string) {
    await requirePermission('finance', 'view')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [purchases, expenses, assets] = await Promise.all([
        prisma.inventoryPurchase.findMany({
            where: {
                outletId,
                paymentStatus: { in: ['UNPAID', 'OVERDUE'] },
            },
        }),
        prisma.expense.findMany({
            where: {
                outletId,
                paymentStatus: { in: ['UNPAID', 'OVERDUE'] },
            },
        }),
        prisma.asset.findMany({
            where: {
                outletId,
                paymentStatus: { in: ['UNPAID', 'OVERDUE'] },
            },
        }),
    ])

    const purchaseTotal = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)
    const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const assetTotal = assets.reduce((sum, a) => sum + Number(a.purchasePrice), 0)
    const totalDebt = purchaseTotal + expenseTotal + assetTotal
    const totalCount = purchases.length + expenses.length + assets.length

    const isOverdue = (item: { paymentStatus: string; dueDate: Date | null }) =>
        item.paymentStatus === 'OVERDUE' || (item.paymentStatus === 'UNPAID' && item.dueDate && new Date(item.dueDate) < today)

    const overduePurchases = purchases.filter(isOverdue)
    const overdueExpenses = expenses.filter(isOverdue)
    const overdueAssets = assets.filter(isOverdue)

    const overdueCount = overduePurchases.length + overdueExpenses.length + overdueAssets.length

    const overduePurchaseTotal = overduePurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)
    const overdueExpenseTotal = overdueExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const overdueAssetTotal = overdueAssets.reduce((sum, a) => sum + Number(a.purchasePrice), 0)
    const overdueTotal = overduePurchaseTotal + overdueExpenseTotal + overdueAssetTotal

    return {
        totalDebt,
        totalCount,
        purchaseTotal,
        purchaseCount: purchases.length,
        expenseTotal,
        expenseCount: expenses.length,
        assetTotal,
        assetCount: assets.length,
        overdueTotal,
        overdueCount,
    }
}

/**
 * Batch pay selected debts — mark them all as PAID in a single transaction.
 * Accepts arrays of purchase IDs, expense IDs, and asset IDs.
 */
export async function batchPayDebts(
    purchaseIds: string[],
    expenseIds: string[],
    assetIds: string[] = [],
    paymentSource?: string,
) {
    await requirePermission('finance', 'update')

    if (purchaseIds.length === 0 && expenseIds.length === 0 && assetIds.length === 0) {
        return { success: false, error: "Tidak ada transaksi yang dipilih." }
    }

    try {
        const now = new Date()

        await prisma.$transaction(async (tx) => {
            // 1. Update all selected InventoryPurchases → PAID
            if (purchaseIds.length > 0) {
                await tx.inventoryPurchase.updateMany({
                    where: {
                        id: { in: purchaseIds },
                        paymentStatus: { in: ['UNPAID', 'OVERDUE'] },
                    },
                    data: {
                        paymentStatus: 'PAID',
                        paidAt: now,
                        ...(paymentSource ? { paymentSource } : {}),
                    },
                })
            }

            // 2. Update all selected Expenses → PAID
            if (expenseIds.length > 0) {
                await tx.expense.updateMany({
                    where: {
                        id: { in: expenseIds },
                        paymentStatus: { in: ['UNPAID', 'OVERDUE'] },
                    },
                    data: {
                        paymentStatus: 'PAID',
                        paidAt: now,
                        ...(paymentSource ? { paymentSource } : {}),
                    },
                })
            }

            // 3. Update all selected Assets → PAID
            if (assetIds.length > 0) {
                await tx.asset.updateMany({
                    where: {
                        id: { in: assetIds },
                        paymentStatus: { in: ['UNPAID', 'OVERDUE'] },
                    },
                    data: {
                        paymentStatus: 'PAID',
                        paidAt: now,
                        ...(paymentSource ? { paymentSource } : {}),
                    },
                })
            }
        })

        const totalCount = purchaseIds.length + expenseIds.length + assetIds.length

        // Revalidate all affected pages
        revalidatePath('/finance/debt-payment')
        revalidatePath('/finance/expenses')
        revalidatePath('/finance/assets')
        revalidatePath('/finance/cash-flow')
        revalidatePath('/finance/balance-sheet')
        revalidatePath('/finance/profit')
        revalidatePath('/inventory/purchases')

        return {
            success: true,
            message: `${totalCount} transaksi berhasil dibayar.`,
        }
    } catch (error) {
        console.error("Failed to batch pay debts:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Gagal memproses pembayaran.",
        }
    }
}
