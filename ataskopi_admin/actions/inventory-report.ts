'use server'

import { db as prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth-utils"
import { parsePrismaDecimal } from "@/lib/utils"

export interface MaterialMovementReport {
    id: string
    name: string
    unit: string
    currentStock: number
    averageCost: number
    purchasedQty: number
    purchasedValue: number
    usedQty: number
    usedValue: number
}

export async function getMaterialMovementReport(
    outletId: string,
    startDate: Date,
    endDate: Date
): Promise<MaterialMovementReport[]> {
    await requirePermission('inventory', 'view')

    // 1. Fetch all raw materials for the outlet
    const rawMaterials = await prisma.rawMaterial.findMany({
        where: { outletId },
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            unit: true,
            currentStock: true,
            averageCost: true,
        }
    })

    // 2. Fetch purchases in date range with status RECEIVED
    // Note: InventoryPurchase.date is @db.Date so it's best to match exactly or using gte/lte
    const purchases = await prisma.inventoryPurchase.groupBy({
        by: ['rawMaterialId'],
        where: {
            outletId,
            deliveryStatus: 'RECEIVED',
            date: {
                gte: startDate,
                lte: endDate,
            }
        },
        _sum: {
            quantity: true,
        }
    })

    const purchaseMap = new Map<string, number>()
    for (const p of purchases) {
        purchaseMap.set(p.rawMaterialId, Number(p._sum.quantity || 0))
    }

    // 3. Fetch completed stock opnames in date range to calculate usage
    const opnames = await prisma.stockOpname.findMany({
        where: {
            outletId,
            status: 'COMPLETED',
            date: {
                gte: startDate,
                lte: endDate,
            }
        },
        include: {
            items: {
                select: {
                    rawMaterialId: true,
                    systemStock: true,
                    actualStock: true,
                }
            }
        }
    })

    const usageMap = new Map<string, number>()
    for (const opname of opnames) {
        for (const item of opname.items) {
            const sys = Number(item.systemStock)
            const act = Number(item.actualStock)
            const used = sys - act // If system > actual, it means stock was used/wasted

            if (used > 0) {
                const current = usageMap.get(item.rawMaterialId) || 0
                usageMap.set(item.rawMaterialId, current + used)
            }
        }
    }

    // 4. Merge data
    const report: MaterialMovementReport[] = rawMaterials.map(mat => {
        const currentStock = parsePrismaDecimal(mat.currentStock)
        const averageCost = parsePrismaDecimal(mat.averageCost)
        const purchasedQty = purchaseMap.get(mat.id) || 0
        const usedQty = usageMap.get(mat.id) || 0

        return {
            id: mat.id,
            name: mat.name,
            unit: mat.unit,
            currentStock,
            averageCost,
            purchasedQty,
            purchasedValue: purchasedQty * averageCost,
            usedQty,
            usedValue: usedQty * averageCost,
        }
    })

    return report
}
