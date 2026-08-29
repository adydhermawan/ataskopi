'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export interface UnpaidDebtItem {
    id: string
    type: 'purchase' | 'expense'
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
 * Get all unpaid debts (UNPAID + OVERDUE) from InventoryPurchase and Expense
 */
export async function getUnpaidDebts(outletId: string): Promise<UnpaidDebtItem[]> {
    await requirePermission('finance', 'view')

    const [purchases, expenses] = await Promise.all([
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
    ])

    const purchaseItems: UnpaidDebtItem[] = purchases.map((p) => ({
        id: p.id,
        type: 'purchase' as const,
        date: p.date,
        description: p.notes || `Pembelian ${p.rawMaterial.name}`,
        category: 'PEMBELIAN',
        supplier: p.supplier,
        paymentSource: p.paymentSource,
        paymentStatus: p.paymentStatus,
        dueDate: p.dueDate,
        amount: Number(p.totalAmount),
        rawMaterialName: p.rawMaterial.name,
    }))

    const expenseItems: UnpaidDebtItem[] = expenses.map((e) => ({
        id: e.id,
        type: 'expense' as const,
        date: e.date,
        description: e.description || e.category,
        category: e.category,
        supplier: null,
        paymentSource: e.paymentSource,
        paymentStatus: e.paymentStatus,
        dueDate: e.dueDate,
        amount: Number(e.amount),
    }))

    // Combine and sort by date desc
    const allDebts = [...purchaseItems, ...expenseItems].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return allDebts
}

/**
 * Get summary of all unpaid debts
 */
export async function getDebtSummary(outletId: string) {
    await requirePermission('finance', 'view')

    const [purchases, expenses] = await Promise.all([
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
    ])

    const purchaseTotal = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0)
    const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const totalDebt = purchaseTotal + expenseTotal
    const totalCount = purchases.length + expenses.length

    const overdueCount = purchases.filter(p => p.paymentStatus === 'OVERDUE').length
        + expenses.filter(e => e.paymentStatus === 'OVERDUE').length

    const overduePurchaseTotal = purchases
        .filter(p => p.paymentStatus === 'OVERDUE')
        .reduce((sum, p) => sum + Number(p.totalAmount), 0)
    const overdueExpenseTotal = expenses
        .filter(e => e.paymentStatus === 'OVERDUE')
        .reduce((sum, e) => sum + Number(e.amount), 0)
    const overdueTotal = overduePurchaseTotal + overdueExpenseTotal

    return {
        totalDebt,
        totalCount,
        purchaseTotal,
        purchaseCount: purchases.length,
        expenseTotal,
        expenseCount: expenses.length,
        overdueTotal,
        overdueCount,
    }
}

/**
 * Batch pay selected debts — mark them all as PAID in a single transaction.
 * Accepts arrays of purchase IDs and expense IDs separately.
 */
export async function batchPayDebts(
    purchaseIds: string[],
    expenseIds: string[],
    paymentSource?: string,
) {
    await requirePermission('finance', 'update')

    if (purchaseIds.length === 0 && expenseIds.length === 0) {
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
        })

        const totalCount = purchaseIds.length + expenseIds.length

        // Revalidate all affected pages
        revalidatePath('/finance/debt-payment')
        revalidatePath('/finance/expenses')
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
