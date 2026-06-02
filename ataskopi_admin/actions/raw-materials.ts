'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export async function getRawMaterials(outletId: string) {
    await requirePermission('inventory', 'view')
    return prisma.rawMaterial.findMany({
        where: { outletId },
        orderBy: { name: 'asc' }
    })
}

export async function createRawMaterial(data: { outletId: string; name: string; sku?: string; unit: string; currentStock?: number; averageCost?: number }) {
    await requirePermission('inventory', 'create')
    try {
        await prisma.rawMaterial.create({
            data: {
                outletId: data.outletId,
                name: data.name,
                sku: data.sku,
                unit: data.unit,
                currentStock: data.currentStock || 0,
                averageCost: data.averageCost || 0
            }
        })
        revalidatePath('/admin/inventory/materials')
        return { success: true }
    } catch (error) {
        console.error("Failed to create raw material:", error)
        return { success: false, error: "Failed to create raw material" }
    }
}

export async function updateRawMaterial(id: string, data: { name: string; sku?: string; unit: string; currentStock?: number; averageCost?: number }) {
    await requirePermission('inventory', 'update')
    try {
        await prisma.rawMaterial.update({
            where: { id },
            data: {
                name: data.name,
                sku: data.sku,
                unit: data.unit,
                currentStock: data.currentStock,
                averageCost: data.averageCost
            }
        })
        revalidatePath('/admin/inventory/materials')
        return { success: true }
    } catch (error) {
        console.error("Failed to update raw material:", error)
        return { success: false, error: "Failed to update raw material" }
    }
}

export async function deleteRawMaterial(id: string) {
    await requirePermission('inventory', 'delete')
    try {
        await prisma.rawMaterial.delete({
            where: { id }
        })
        revalidatePath('/admin/inventory/materials')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete raw material:", error)
        return { success: false, error: "Failed to delete raw material" }
    }
}
