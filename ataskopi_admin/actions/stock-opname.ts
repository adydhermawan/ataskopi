'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export async function getStockOpnames(outletId: string) {
    await requirePermission('inventory', 'view')
    return prisma.stockOpname.findMany({
        where: { outletId },
        include: {
            items: {
                include: {
                    rawMaterial: true
                }
            }
        },
        orderBy: { date: 'desc' }
    })
}

export async function getStockOpname(id: string) {
    await requirePermission('inventory', 'view')
    return prisma.stockOpname.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    rawMaterial: true
                }
            }
        }
    })
}

export async function createStockOpname(data: { 
    outletId: string; 
    date: Date; 
    status?: string; 
    notes?: string; 
    items: { 
        rawMaterialId: string; 
        systemStock: number; 
        actualStock: number; 
        difference: number; 
        unitCost: number;
    }[] 
}) {
    await requirePermission('inventory', 'create')
    try {
        const opname = await prisma.$transaction(async (tx) => {
            const isCompleted = data.status === 'COMPLETED'
            let totalCogs = 0

            const itemsData = data.items.map(item => {
                const consumed = isCompleted ? (item.systemStock - item.actualStock) : 0
                const cogsValue = consumed > 0 ? (consumed * item.unitCost) : 0
                totalCogs += cogsValue

                return {
                    rawMaterialId: item.rawMaterialId,
                    systemStock: item.systemStock,
                    actualStock: item.actualStock,
                    difference: item.difference,
                    unitCost: item.unitCost,
                    cogsValue: cogsValue
                }
            })

            const newOpname = await tx.stockOpname.create({
                data: {
                    outletId: data.outletId,
                    date: data.date,
                    status: data.status || 'DRAFT',
                    notes: data.notes,
                    cogsAmount: totalCogs,
                    items: {
                        create: itemsData
                    }
                }
            })

            if (isCompleted) {
                for (const item of data.items) {
                    await tx.rawMaterial.update({
                        where: { id: item.rawMaterialId },
                        data: { currentStock: item.actualStock }
                    })
                }
            }

            return newOpname
        })

        revalidatePath('/inventory/opname')
        return { success: true, id: opname.id }
    } catch (error) {
        console.error("Failed to create stock opname:", error)
        return { success: false, error: "Failed to create stock opname" }
    }
}

export async function updateStockOpnameStatus(id: string, status: string) {
    await requirePermission('inventory', 'update')
    try {
        await prisma.$transaction(async (tx) => {
            const opname = await tx.stockOpname.findUnique({
                where: { id },
                include: { items: true }
            })

            if (!opname) throw new Error("Stock opname tidak ditemukan")
            if (opname.status === 'COMPLETED') throw new Error("Tidak dapat mengubah stock opname yang sudah selesai")

            if (status === 'COMPLETED') {
                let totalCogs = 0
                for (const item of opname.items) {
                    const systemStock = Number(item.systemStock)
                    const actualStock = Number(item.actualStock)
                    const unitCost = Number(item.unitCost)

                    const consumed = systemStock - actualStock
                    const cogsValue = consumed > 0 ? (consumed * unitCost) : 0
                    totalCogs += cogsValue

                    // Update item cogsValue
                    await tx.stockOpnameItem.update({
                        where: { id: item.id },
                        data: { cogsValue }
                    })

                    // Update RawMaterial current stock
                    await tx.rawMaterial.update({
                        where: { id: item.rawMaterialId },
                        data: { currentStock: actualStock }
                    })
                }

                // Update stock opname status and total cogsAmount
                await tx.stockOpname.update({
                    where: { id },
                    data: { 
                        status,
                        cogsAmount: totalCogs
                    }
                })
            } else {
                await tx.stockOpname.update({
                    where: { id },
                    data: { status }
                })
            }
        })

        revalidatePath('/inventory/opname')
        return { success: true }
    } catch (error) {
        console.error("Failed to update stock opname status:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to update stock opname status" }
    }
}

export async function deleteStockOpname(id: string) {
    await requirePermission('inventory', 'delete')
    try {
        const opname = await prisma.stockOpname.findUnique({ where: { id } })
        if (opname?.status === 'COMPLETED') {
            return { success: false, error: "Tidak dapat menghapus stock opname yang sudah selesai" }
        }

        await prisma.stockOpname.delete({
            where: { id }
        })
        revalidatePath('/inventory/opname')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete stock opname:", error)
        return { success: false, error: "Failed to delete stock opname" }
    }
}
