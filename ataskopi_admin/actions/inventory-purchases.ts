'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"
import { Decimal } from "@prisma/client/runtime/library"
import { invalidateProjectionCache } from "@/lib/cache/projection-cache"

export async function getInventoryPurchases(
    outletId: string,
    startDate?: Date,
    endDate?: Date,
    filters?: {
        paymentStatus?: string;   // "ALL" | "UNPAID" | "OVERDUE" | "PAID"
        deliveryStatus?: string;  // "ALL" | "SHIPPING" | "RECEIVED"
    }
) {
    await requirePermission('inventory', 'view')

    const paymentFilter = filters?.paymentStatus && filters.paymentStatus !== 'ALL'
        ? { paymentStatus: filters.paymentStatus }
        : {}

    const deliveryFilter = filters?.deliveryStatus && filters.deliveryStatus !== 'ALL'
        ? { deliveryStatus: filters.deliveryStatus }
        : {}

    return prisma.inventoryPurchase.findMany({
        where: {
            outletId,
            ...(startDate && endDate ? {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            } : {}),
            ...paymentFilter,
            ...deliveryFilter,
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

/**
 * Helper: update currentStock & averageCost on a RawMaterial
 * Used when a purchase is created with deliveryStatus=RECEIVED or when marking as received.
 */
async function addStockToMaterial(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    rawMaterialId: string,
    quantity: number,
    totalAmount: number
) {
    const material = await tx.rawMaterial.findUnique({
        where: { id: rawMaterialId }
    })
    if (!material) throw new Error("Bahan baku tidak ditemukan")

    const oldStock = Number(material.currentStock)
    const oldAvgCost = Number(material.averageCost)
    const newStock = oldStock + quantity

    // Moving Average Cost = (oldStock * oldAvgCost + totalAmount) / (oldStock + quantity)
    const newAvgCost = newStock > 0
        ? (oldStock * oldAvgCost + totalAmount) / newStock
        : 0

    await tx.rawMaterial.update({
        where: { id: rawMaterialId },
        data: {
            currentStock: new Decimal(newStock.toFixed(2)),
            averageCost: new Decimal(newAvgCost.toFixed(2)),
        }
    })

    return { materialName: material.name, unit: material.unit, newAvgCost }
}

/**
 * Helper: reverse stock changes when deleting a received purchase.
 */
async function removeStockFromMaterial(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    rawMaterialId: string,
    quantity: number,
    totalAmount: number
) {
    const material = await tx.rawMaterial.findUnique({
        where: { id: rawMaterialId }
    })
    if (!material) return

    const oldStock = Number(material.currentStock)
    const oldAvgCost = Number(material.averageCost)
    const newStock = Math.max(0, oldStock - quantity)

    // Reverse Moving Average: (oldStock * oldAvgCost - total) / (oldStock - qty)
    let newAvgCost = oldAvgCost
    if (newStock > 0) {
        const calculated = (oldStock * oldAvgCost - totalAmount) / newStock
        if (calculated > 0) {
            newAvgCost = calculated
        }
    }

    await tx.rawMaterial.update({
        where: { id: rawMaterialId },
        data: {
            currentStock: new Decimal(newStock.toFixed(2)),
            averageCost: new Decimal(newAvgCost.toFixed(2)),
        }
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
    paymentMethod?: string;   // "CASH" | "PAYLATER"
    paymentSource?: string;   // Nama layanan: "Jago Atas Kopi", "Mandiri", etc.
    omzetDate?: Date;         // Tanggal ambil omzet kas harian
    dueDate?: Date;
    deliveryStatus?: string;  // "RECEIVED" | "SHIPPING"
}) {
    await requirePermission('inventory', 'create')
    try {
        const paymentMethod = data.paymentMethod || 'CASH'
        const deliveryStatus = data.deliveryStatus || 'RECEIVED'
        const paymentStatus = paymentMethod === 'PAYLATER' ? 'UNPAID' : 'PAID'

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
                    paymentMethod,
                    paymentSource: data.paymentSource || null,
                    paymentStatus,
                    omzetDate: data.omzetDate || null,
                    dueDate: paymentMethod === 'PAYLATER' && data.dueDate ? data.dueDate : null,
                    paidAt: paymentMethod === 'CASH' ? new Date() : null,
                    deliveryStatus,
                    receivedAt: deliveryStatus === 'RECEIVED' ? new Date() : null,
                }
            })

            // 2. Only update stock if barang sudah diterima (RECEIVED)
            let materialInfo = { materialName: '', unit: '', newAvgCost: 0 }
            if (deliveryStatus === 'RECEIVED') {
                materialInfo = await addStockToMaterial(tx, data.rawMaterialId, data.quantity, data.totalAmount)
            } else {
                // Fetch material name for the response message
                const material = await tx.rawMaterial.findUnique({ where: { id: data.rawMaterialId } })
                materialInfo = { materialName: material?.name || '', unit: material?.unit || '', newAvgCost: 0 }
            }

            return { purchase, ...materialInfo }
        })

        revalidatePath('/inventory/purchases')
        revalidatePath('/inventory/materials')
        invalidateProjectionCache(data.outletId)

        if (deliveryStatus === 'RECEIVED') {
            return {
                success: true,
                message: `Pembelian dicatat. Stok ${result.materialName} bertambah ${data.quantity} ${result.unit} (Harga modal rata-rata: Rp ${result.newAvgCost.toFixed(0)}/${result.unit})`
            }
        } else {
            return {
                success: true,
                message: `Pembelian dicatat. Barang "${result.materialName}" dalam status pengiriman — stok akan bertambah setelah barang diterima.`
            }
        }
    } catch (error) {
        console.error("Failed to create inventory purchase:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to create purchase" }
    }
}

/**
 * Mark a SHIPPING purchase as RECEIVED → update stock & averageCost
 */
export async function markPurchaseAsReceived(id: string) {
    await requirePermission('inventory', 'update')
    try {
        const result = await prisma.$transaction(async (tx) => {
            const purchase = await tx.inventoryPurchase.findUnique({ where: { id } })
            if (!purchase) throw new Error("Pembelian tidak ditemukan")
            if (purchase.deliveryStatus === 'RECEIVED') throw new Error("Barang sudah diterima sebelumnya")

            // Update delivery status
            await tx.inventoryPurchase.update({
                where: { id },
                data: {
                    deliveryStatus: 'RECEIVED',
                    receivedAt: new Date(),
                }
            })

            // Now add stock
            const qty = Number(purchase.quantity)
            const total = Number(purchase.totalAmount)
            const materialInfo = await addStockToMaterial(tx, purchase.rawMaterialId, qty, total)

            return { outletId: purchase.outletId, ...materialInfo }
        })

        revalidatePath('/inventory/purchases')
        revalidatePath('/inventory/materials')
        invalidateProjectionCache(result.outletId)

        return {
            success: true,
            message: `Barang "${result.materialName}" diterima! Stok bertambah ${result.unit}. Harga modal rata-rata: Rp ${result.newAvgCost.toFixed(0)}/${result.unit}`
        }
    } catch (error) {
        console.error("Failed to mark purchase as received:", error)
        return { success: false, error: error instanceof Error ? error.message : "Gagal mengubah status barang" }
    }
}

/**
 * Mark an UNPAID/OVERDUE paylater purchase as PAID
 */
export async function markPurchaseAsPaid(id: string) {
    await requirePermission('inventory', 'update')
    try {
        const purchase = await prisma.inventoryPurchase.findUnique({ where: { id } })
        if (!purchase) throw new Error("Pembelian tidak ditemukan")
        if (purchase.paymentStatus === 'PAID') throw new Error("Pembelian sudah lunas")

        await prisma.inventoryPurchase.update({
            where: { id },
            data: {
                paymentStatus: 'PAID',
                paidAt: new Date(),
            }
        })

        revalidatePath('/inventory/purchases')
        revalidatePath('/finance/cash-flow')
        revalidatePath('/finance/balance-sheet')

        return { success: true, message: "Pembayaran berhasil dicatat sebagai lunas." }
    } catch (error) {
        console.error("Failed to mark purchase as paid:", error)
        return { success: false, error: error instanceof Error ? error.message : "Gagal mengubah status pembayaran" }
    }
}

/**
 * Get count of unpaid/overdue purchases (for sidebar badge)
 */
export async function getPayablesCount(outletId: string) {
    await requirePermission('inventory', 'view')
    const count = await prisma.inventoryPurchase.count({
        where: {
            outletId,
            paymentStatus: { in: ['UNPAID', 'OVERDUE'] }
        }
    })
    return count
}

/**
 * Get summary of payables and shipping for dashboard cards
 */
export async function getPurchaseSummary(outletId: string) {
    await requirePermission('inventory', 'view')

    const [payables, shipping] = await Promise.all([
        prisma.inventoryPurchase.findMany({
            where: {
                outletId,
                paymentStatus: { in: ['UNPAID', 'OVERDUE'] }
            }
        }),
        prisma.inventoryPurchase.findMany({
            where: {
                outletId,
                deliveryStatus: 'SHIPPING'
            }
        })
    ])

    const totalPayables = payables.reduce((sum, p) => sum + Number(p.totalAmount), 0)
    const payablesCount = payables.length
    const overdueCount = payables.filter(p => p.paymentStatus === 'OVERDUE').length

    const totalShipping = shipping.reduce((sum, p) => sum + Number(p.totalAmount), 0)
    const shippingCount = shipping.length

    return {
        totalPayables,
        payablesCount,
        overdueCount,
        totalShipping,
        shippingCount,
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

            // Only reverse stock if barang sudah pernah diterima (RECEIVED)
            if (purchase.deliveryStatus === 'RECEIVED') {
                const qty = Number(purchase.quantity)
                const total = Number(purchase.totalAmount)
                await removeStockFromMaterial(tx, purchase.rawMaterialId, qty, total)
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

export async function updateInventoryPurchase(
    id: string,
    data: {
        date: Date;
        paymentMethod: string;
        paymentSource?: string | null;
        paymentStatus: string;
        omzetDate?: Date | null;
        dueDate?: Date | null;
    }
) {
    await requirePermission('inventory', 'update')
    try {
        const purchase = await prisma.inventoryPurchase.findUnique({
            where: { id }
        })
        if (!purchase) throw new Error("Pembelian tidak ditemukan")

        const paymentMethod = data.paymentMethod
        let paymentStatus = data.paymentStatus
        let dueDate = paymentMethod === 'PAYLATER' ? data.dueDate : null
        let paidAt = purchase.paidAt

        if (paymentMethod === 'CASH') {
            paymentStatus = 'PAID'
            if (!paidAt) paidAt = new Date()
            dueDate = null
        } else if (paymentMethod === 'PAYLATER') {
            if (paymentStatus === 'PAID') {
                if (!paidAt) paidAt = new Date()
            } else {
                paidAt = null
                // Check if overdue
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                if (dueDate && new Date(dueDate) < today) {
                    paymentStatus = 'OVERDUE'
                } else {
                    paymentStatus = 'UNPAID'
                }
            }
        }

        await prisma.inventoryPurchase.update({
            where: { id },
            data: {
                date: data.date,
                paymentMethod,
                paymentSource: data.paymentSource !== undefined ? data.paymentSource : undefined,
                paymentStatus,
                omzetDate: data.omzetDate !== undefined ? data.omzetDate : undefined,
                dueDate,
                paidAt,
            }
        })

        revalidatePath('/inventory/purchases')
        revalidatePath('/inventory/materials')
        revalidatePath('/finance/cash-flow')
        revalidatePath('/finance/balance-sheet')
        invalidateProjectionCache(purchase.outletId)

        return { success: true, message: "Pembelian berhasil diperbarui" }
    } catch (error) {
        console.error("Failed to update inventory purchase:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to update purchase" }
    }
}
