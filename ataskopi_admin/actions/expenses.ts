'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export async function getExpenses(outletId: string, startDate?: Date, endDate?: Date) {
    await requirePermission('finance', 'view')
    return prisma.expense.findMany({
        where: { 
            outletId,
            ...(startDate && endDate ? {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            } : {})
        },
        orderBy: { date: 'desc' }
    })
}

export async function createExpense(data: {
    outletId: string;
    date: Date;
    category: string;
    amount: number;
    description?: string;
}) {
    await requirePermission('finance', 'create')
    try {
        await prisma.expense.create({
            data: {
                outletId: data.outletId,
                date: data.date,
                category: data.category,
                amount: data.amount,
                description: data.description,
            }
        })

        revalidatePath('/finance/expenses')
        return { success: true }
    } catch (error) {
        console.error("Failed to create expense:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to create expense" }
    }
}

export async function updateExpense(id: string, data: {
    date: Date;
    category: string;
    amount: number;
    description?: string;
}) {
    await requirePermission('finance', 'update')
    try {
        await prisma.expense.update({
            where: { id },
            data: {
                date: data.date,
                category: data.category,
                amount: data.amount,
                description: data.description,
            }
        })

        revalidatePath('/finance/expenses')
        return { success: true }
    } catch (error) {
        console.error("Failed to update expense:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to update expense" }
    }
}

export async function deleteExpense(id: string) {
    await requirePermission('finance', 'delete')
    try {
        await prisma.expense.delete({ where: { id } })

        revalidatePath('/finance/expenses')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete expense:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete expense" }
    }
}
