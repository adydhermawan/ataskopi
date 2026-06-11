'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"
import { Decimal } from "@prisma/client/runtime/library"
import { invalidateProjectionCache } from "@/lib/cache/projection-cache"

export async function getInventoryPurchases(outletId: string, startDate?: Date, endDate?: Date) {
    await requirePermission('inventory', 'view')
    return prisma.inventoryPurchase.findMany({
        where: { 
            outletId,
            ...(startDate && endDate ? {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            } : {})
        },
        include: {
            rawMaterial: {
                select: {
                    id: true,
                    name: true,
                    unit: true,
                }
            }
        },
        orderBy: { date: 'desc' }
    })
}

export async function createInventoryPurchase(data: {
    outletId: string;
    rawMaterialId: string;
    date: Date;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    supplier?: string;
    notes?: string;
}) {
    await requirePermission('inventory', 'create')
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create InventoryPurchase record
            const purchase = await tx.inventoryPurchase.create({
                data: {
                    outletId: data.outletId,
                    rawMaterialId: data.rawMaterialId,
                    date: data.date,
                    quantity: new Decimal(data.quantity.toFixed(2)),
                    unitPrice: new Decimal(data.unitPrice.toFixed(2)),
                    totalAmount: new Decimal(data.totalAmount.toFixed(2)),
                    supplier: data.supplier || null,
                    notes: data.notes || null,
                }
            })

            // 2. Fetch raw material to recalculate stock & average cost
            const material = await tx.rawMaterial.findUnique({
                where: { id: data.rawMaterialId }
            })
            if (!material) throw new Error("Bahan baku tidak ditemukan")

            const oldStock = Number(material.currentStock)
            const oldAvgCost = Number(material.averageCost)
            const newStock = oldStock + data.quantity

            // Moving Average Cost = (oldStock * oldAvgCost + totalAmount) / (oldStock + quantity)
            const newAvgCost = newStock > 0
                ? (oldStock * oldAvgCost + data.totalAmount) / newStock
                : 0

            // 3. Update RawMaterial
            await tx.rawMaterial.update({
                where: { id: data.rawMaterialId },
                data: {
                    currentStock: new Decimal(newStock.toFixed(2)),
                    averageCost: new Decimal(newAvgCost.toFixed(2)),
                }
            })

            return { purchase, materialName: material.name, unit: material.unit, newAvgCost }
        })

        revalidatePath('/inventory/purchases')
        revalidatePath('/inventory/materials')
        invalidateProjectionCache(data.outletId)
        return { 
            success: true, 
            message: `Pembelian dicatat. Stok ${result.materialName} bertambah ${data.quantity} ${result.unit} (Harga modal rata-rata: Rp ${result.newAvgCost.toFixed(0)}/${result.unit})`
        }
    } catch (error) {
        console.error("Failed to create inventory purchase:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to create purchase" }
    }
}

export async function deleteInventoryPurchase(id: string) {
    await requirePermission('inventory', 'delete')
    try {
        const result = await prisma.$transaction(async (tx) => {
            const purchase = await tx.inventoryPurchase.findUnique({
                where: { id }
            })
            if (!purchase) throw new Error("Pembelian tidak ditemukan")

            const qty = Number(purchase.quantity)
            const total = Number(purchase.totalAmount)

            const material = await tx.rawMaterial.findUnique({
                where: { id: purchase.rawMaterialId }
            })

            if (material) {
                const oldStock = Number(material.currentStock)
                const oldAvgCost = Number(material.averageCost)
                const newStock = Math.max(0, oldStock - qty)

                // Reverse Moving Average: (oldStock * oldAvgCost - total) / (oldStock - qty)
                let newAvgCost = oldAvgCost
                if (newStock > 0) {
                    const calculated = (oldStock * oldAvgCost - total) / newStock
                    if (calculated > 0) {
                        newAvgCost = calculated
                    }
                }

                await tx.rawMaterial.update({
                    where: { id: purchase.rawMaterialId },
                    data: {
                        currentStock: new Decimal(newStock.toFixed(2)),
                        averageCost: new Decimal(newAvgCost.toFixed(2)),
                    }
                })
            }

            await tx.inventoryPurchase.delete({
                where: { id }
            })

            return { success: true, outletId: purchase.outletId }
        })

        revalidatePath('/inventory/purchases')
        revalidatePath('/inventory/materials')
        if (result.success && result.outletId) {
            invalidateProjectionCache(result.outletId)
        }
        return result
    } catch (error) {
        console.error("Failed to delete inventory purchase:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete purchase" }
    }
}
