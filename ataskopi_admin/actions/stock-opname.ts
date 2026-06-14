'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"
import { invalidateProjectionCache } from "@/lib/cache/projection-cache"
import { parsePrismaDecimal } from "@/lib/utils"

export async function getStockOpnames(outletId: string) {
    await requirePermission('inventory', 'view')
    const opnames = await prisma.stockOpname.findMany({
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
    return opnames.map(o => ({
        ...o,
        cogsAmount: parsePrismaDecimal(o.cogsAmount),
        items: o.items.map(item => ({
            ...item,
            systemStock: parsePrismaDecimal(item.systemStock),
            actualStock: parsePrismaDecimal(item.actualStock),
            difference: parsePrismaDecimal(item.difference),
            unitCost: parsePrismaDecimal(item.unitCost),
            cogsValue: parsePrismaDecimal(item.cogsValue),
            rawMaterial: item.rawMaterial ? {
                ...item.rawMaterial,
                currentStock: parsePrismaDecimal(item.rawMaterial.currentStock),
                averageCost: parsePrismaDecimal(item.rawMaterial.averageCost),
                packagingWeight: parsePrismaDecimal(item.rawMaterial.packagingWeight),
            } : null
        }))
    }))
}

export async function getStockOpname(id: string) {
    await requirePermission('inventory', 'view')
    const opname = await prisma.stockOpname.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    rawMaterial: true
                }
            }
        }
    })
    if (!opname) return null
    return {
        ...opname,
        cogsAmount: parsePrismaDecimal(opname.cogsAmount),
        items: opname.items.map(item => ({
            ...item,
            systemStock: parsePrismaDecimal(item.systemStock),
            actualStock: parsePrismaDecimal(item.actualStock),
            difference: parsePrismaDecimal(item.difference),
            unitCost: parsePrismaDecimal(item.unitCost),
            cogsValue: parsePrismaDecimal(item.cogsValue),
            rawMaterial: item.rawMaterial ? {
                ...item.rawMaterial,
                currentStock: parsePrismaDecimal(item.rawMaterial.currentStock),
                averageCost: parsePrismaDecimal(item.rawMaterial.averageCost),
                packagingWeight: parsePrismaDecimal(item.rawMaterial.packagingWeight),
            } : null
        }))
    }
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
        invalidateProjectionCache(data.outletId)
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
        // Invalidate cache — need to fetch outletId from the opname
        const opnameForCache = await prisma.stockOpname.findUnique({ where: { id }, select: { outletId: true } })
        if (opnameForCache) invalidateProjectionCache(opnameForCache.outletId)
        return { success: true }
    } catch (error) {
        console.error("Failed to update stock opname status:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to update stock opname status" }
    }
}

export async function deleteStockOpname(id: string) {
    await requirePermission('inventory', 'delete')
    try {
        const opname = await prisma.stockOpname.findUnique({
            where: { id },
            include: { items: true }
        })
        if (!opname) {
            return { success: false, error: "Stock opname tidak ditemukan" }
        }

        await prisma.$transaction(async (tx) => {
            if (opname.status === 'COMPLETED') {
                for (const item of opname.items) {
                    const diff = Number(item.difference)
                    await tx.rawMaterial.update({
                        where: { id: item.rawMaterialId },
                        data: {
                            currentStock: {
                                decrement: diff
                            }
                        }
                    })
                }
            }

            await tx.stockOpname.delete({
                where: { id }
            })
        })

        revalidatePath('/inventory/opname')
        invalidateProjectionCache(opname.outletId)
        return { success: true }
    } catch (error) {
        console.error("Failed to delete stock opname:", error)
        return { success: false, error: "Failed to delete stock opname" }
    }
}

export async function updateStockOpname(
    id: string,
    data: {
        date: Date;
        notes?: string;
        status?: string;
        items: {
            rawMaterialId: string;
            systemStock: number;
            actualStock: number;
            difference: number;
            unitCost: number;
        }[];
    }
) {
    await requirePermission('inventory', 'update')
    try {
        const opname = await prisma.$transaction(async (tx) => {
            const oldOpname = await tx.stockOpname.findUnique({
                where: { id },
                include: { items: true }
            })
            if (!oldOpname) throw new Error("Stock opname tidak ditemukan")

            const wasCompleted = oldOpname.status === 'COMPLETED'
            const isCompleted = data.status === 'COMPLETED'

            // If it was completed, we first revert the old stock adjustments
            if (wasCompleted) {
                for (const oldItem of oldOpname.items) {
                    const diff = Number(oldItem.difference)
                    await tx.rawMaterial.update({
                        where: { id: oldItem.rawMaterialId },
                        data: {
                            currentStock: {
                                decrement: diff
                            }
                        }
                    })
                }
            }

            // Calculate COGS / HPP
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

            // Delete old items and insert new ones
            await tx.stockOpnameItem.deleteMany({
                where: { stockOpnameId: id }
            })

            const updatedOpname = await tx.stockOpname.update({
                where: { id },
                data: {
                    date: data.date,
                    status: data.status || 'DRAFT',
                    notes: data.notes || null,
                    cogsAmount: totalCogs,
                    items: {
                        create: itemsData
                    }
                }
            })

            // If the updated state is completed, apply the new stock adjustments
            if (isCompleted) {
                for (const item of data.items) {
                    await tx.rawMaterial.update({
                        where: { id: item.rawMaterialId },
                        data: {
                            currentStock: {
                                increment: item.difference
                            }
                        }
                    })
                }
            }

            return updatedOpname
        })

        revalidatePath('/inventory/opname')
        invalidateProjectionCache(opname.outletId)
        return { success: true, id: opname.id }
    } catch (error) {
        console.error("Failed to update stock opname:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to update stock opname" }
    }
}

