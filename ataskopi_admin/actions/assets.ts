'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export async function getAssets(outletId: string) {
    await requirePermission('finance', 'view')
    return prisma.asset.findMany({
        where: { outletId },
        orderBy: { purchaseDate: 'desc' }
    })
}

export async function createAsset(data: {
    outletId: string;
    name: string;
    purchaseDate: Date;
    purchasePrice: number;
    usefulLifeMonths?: number;
    status?: string;
    notes?: string;
    paymentMethod?: string;
    paymentSource?: string;
    paymentStatus?: string;
    dueDate?: Date;
    paidAt?: Date;
    omzetDate?: Date;
}) {
    await requirePermission('finance', 'create')
    try {
        const usefulLifeMonths = data.usefulLifeMonths || 12
        const monthlyDepreciation = data.purchasePrice / usefulLifeMonths
        const paymentMethod = data.paymentMethod || 'CASH'
        const paymentStatus = data.paymentStatus || (paymentMethod === 'PAYLATER' ? 'UNPAID' : 'PAID')

        await prisma.asset.create({
            data: {
                outletId: data.outletId,
                name: data.name,
                purchaseDate: data.purchaseDate,
                purchasePrice: data.purchasePrice,
                usefulLifeMonths,
                monthlyDepreciation,
                status: data.status || 'ACTIVE',
                notes: data.notes,
                paymentMethod,
                paymentSource: data.paymentSource || null,
                paymentStatus,
                dueDate: paymentMethod === 'PAYLATER' && data.dueDate ? data.dueDate : null,
                paidAt: paymentStatus === 'PAID' ? (data.paidAt || new Date()) : null,
                omzetDate: data.omzetDate || null,
            }
        })
        revalidatePath('/finance/assets')
        revalidatePath('/finance/expenses')
        revalidatePath('/finance/debt-payment')
        revalidatePath('/finance/profit')
        revalidatePath('/finance/balance-sheet')
        revalidatePath('/finance/cash-flow')
        return { success: true }
    } catch (error) {
        console.error("Failed to create asset:", error)
        return { success: false, error: "Failed to create asset" }
    }
}

export async function updateAsset(id: string, data: {
    name: string;
    purchaseDate: Date;
    purchasePrice: number;
    usefulLifeMonths: number;
    status: string;
    notes?: string;
    paymentMethod?: string;
    paymentSource?: string;
    paymentStatus?: string;
    dueDate?: Date;
    paidAt?: Date;
    omzetDate?: Date;
}) {
    await requirePermission('finance', 'update')
    try {
        const monthlyDepreciation = data.purchasePrice / data.usefulLifeMonths

        await prisma.asset.update({
            where: { id },
            data: {
                name: data.name,
                purchaseDate: data.purchaseDate,
                purchasePrice: data.purchasePrice,
                usefulLifeMonths: data.usefulLifeMonths,
                monthlyDepreciation,
                status: data.status,
                notes: data.notes,
                ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod } : {}),
                ...(data.paymentSource !== undefined ? { paymentSource: data.paymentSource } : {}),
                ...(data.paymentStatus !== undefined ? { paymentStatus: data.paymentStatus } : {}),
                ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
                ...(data.paidAt !== undefined ? { paidAt: data.paidAt } : {}),
                ...(data.omzetDate !== undefined ? { omzetDate: data.omzetDate } : {}),
            }
        })
        revalidatePath('/finance/assets')
        revalidatePath('/finance/expenses')
        revalidatePath('/finance/debt-payment')
        revalidatePath('/finance/profit')
        revalidatePath('/finance/balance-sheet')
        revalidatePath('/finance/cash-flow')
        return { success: true }
    } catch (error) {
        console.error("Failed to update asset:", error)
        return { success: false, error: "Failed to update asset" }
    }
}

export async function markAssetAsPaid(id: string, paymentSource?: string) {
    await requirePermission('finance', 'update')
    try {
        await prisma.asset.update({
            where: { id },
            data: {
                paymentStatus: 'PAID',
                paidAt: new Date(),
                ...(paymentSource ? { paymentSource } : {}),
            }
        })
        revalidatePath('/finance/assets')
        revalidatePath('/finance/expenses')
        revalidatePath('/finance/debt-payment')
        revalidatePath('/finance/profit')
        revalidatePath('/finance/balance-sheet')
        revalidatePath('/finance/cash-flow')
        return { success: true }
    } catch (error) {
        console.error("Failed to mark asset as paid:", error)
        return { success: false, error: "Failed to mark asset as paid" }
    }
}

export async function deleteAsset(id: string) {
    await requirePermission('finance', 'delete')
    try {
        await prisma.asset.delete({
            where: { id }
        })
        revalidatePath('/finance/assets')
        revalidatePath('/finance/expenses')
        revalidatePath('/finance/profit')
        revalidatePath('/finance/balance-sheet')
        revalidatePath('/finance/cash-flow')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete asset:", error)
        return { success: false, error: "Failed to delete asset" }
    }
}
