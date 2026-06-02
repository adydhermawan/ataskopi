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

export async function createStockOpname(data: { outletId: string; date: Date; status?: string; notes?: string; items: { rawMaterialId: string; systemStock: number; actualStock: number; difference: number; unitCost: number }[] }) {
    await requirePermission('inventory', 'create')
    try {
        const opname = await prisma.$transaction(async (tx) => {
            const newOpname = await tx.stockOpname.create({
                data: {
                    outletId: data.outletId,
                    date: data.date,
                    status: data.status || 'DRAFT',
                    notes: data.notes,
                    items: {
                        create: data.items.map(item => ({
                            rawMaterialId: item.rawMaterialId,
                            systemStock: item.systemStock,
                            actualStock: item.actualStock,
                            difference: item.difference,
                            unitCost: item.unitCost
                        }))
                    }
                }
            })

            // If completed, update raw material stocks and create expense for loss
            if (newOpname.status === 'COMPLETED') {
                let totalLossValue = 0
                for (const item of data.items) {
                    await tx.rawMaterial.update({
                        where: { id: item.rawMaterialId },
                        data: { currentStock: item.actualStock }
                    })
                    // Track loss (negative difference = missing stock)
                    if (item.difference < 0) {
                        totalLossValue += Math.abs(item.difference) * item.unitCost
                    }
                }

                // Auto-create expense for stock loss if any
                if (totalLossValue > 0) {
                    await tx.expense.create({
                        data: {
                            outletId: data.outletId,
                            date: data.date,
                            category: 'STOCK_LOSS',
                            amount: totalLossValue,
                            description: `Stock opname - selisih stok (waste/loss)`
                        }
                    })
                }
            }

            return newOpname
        })

        revalidatePath('/inventory/opname')
        revalidatePath('/finance/expenses')
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

            if (!opname) throw new Error("Stock opname not found")
            if (opname.status === 'COMPLETED') throw new Error("Cannot modify completed opname")

            await tx.stockOpname.update({
                where: { id },
                data: { status }
            })

            if (status === 'COMPLETED') {
                let totalLossValue = 0
                for (const item of opname.items) {
                    await tx.rawMaterial.update({
                        where: { id: item.rawMaterialId },
                        data: { currentStock: item.actualStock }
                    })
                    const diff = Number(item.difference)
                    if (diff < 0) {
                        totalLossValue += Math.abs(diff) * Number(item.unitCost)
                    }
                }

                if (totalLossValue > 0) {
                    await tx.expense.create({
                        data: {
                            outletId: opname.outletId,
                            date: opname.date,
                            category: 'STOCK_LOSS',
                            amount: totalLossValue,
                            description: `Stock opname - selisih stok (waste/loss)`
                        }
                    })
                }
            }
        })

        revalidatePath('/inventory/opname')
        revalidatePath('/finance/expenses')
        return { success: true }
    } catch (error) {
        console.error("Failed to update stock opname status:", error)
        return { success: false, error: "Failed to update stock opname status" }
    }
}

export async function deleteStockOpname(id: string) {
    await requirePermission('inventory', 'delete')
    try {
        const opname = await prisma.stockOpname.findUnique({ where: { id } })
        if (opname?.status === 'COMPLETED') {
            return { success: false, error: "Cannot delete completed stock opname" }
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
