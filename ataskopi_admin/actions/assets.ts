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

export async function createAsset(data: { outletId: string; name: string; purchaseDate: Date; purchasePrice: number; status?: string; notes?: string }) {
    await requirePermission('finance', 'create')
    try {
        await prisma.asset.create({
            data: {
                outletId: data.outletId,
                name: data.name,
                purchaseDate: data.purchaseDate,
                purchasePrice: data.purchasePrice,
                status: data.status || 'ACTIVE',
                notes: data.notes
            }
        })
        revalidatePath('/finance/assets')
        return { success: true }
    } catch (error) {
        console.error("Failed to create asset:", error)
        return { success: false, error: "Failed to create asset" }
    }
}

export async function updateAsset(id: string, data: { name: string; purchaseDate: Date; purchasePrice: number; status: string; notes?: string }) {
    await requirePermission('finance', 'update')
    try {
        await prisma.asset.update({
            where: { id },
            data: {
                name: data.name,
                purchaseDate: data.purchaseDate,
                purchasePrice: data.purchasePrice,
                status: data.status,
                notes: data.notes
            }
        })
        revalidatePath('/finance/assets')
        return { success: true }
    } catch (error) {
        console.error("Failed to update asset:", error)
        return { success: false, error: "Failed to update asset" }
    }
}

export async function deleteAsset(id: string) {
    await requirePermission('finance', 'delete')
    try {
        await prisma.asset.delete({
            where: { id }
        })
        revalidatePath('/finance/assets')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete asset:", error)
        return { success: false, error: "Failed to delete asset" }
    }
}
