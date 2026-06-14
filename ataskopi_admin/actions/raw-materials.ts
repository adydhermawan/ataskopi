'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"
import { cacheGet, cacheSet, getProjectionCacheKey } from "@/lib/cache/projection-cache"
import { parsePrismaDecimal } from "@/lib/utils"

export async function getRawMaterials(outletId: string) {
    await requirePermission('inventory', 'view')
    const materials = await prisma.rawMaterial.findMany({
        where: { outletId },
        orderBy: { name: 'asc' }
    })
    return materials.map(m => ({
        ...m,
        currentStock: parsePrismaDecimal(m.currentStock),
        averageCost: parsePrismaDecimal(m.averageCost),
        packagingWeight: parsePrismaDecimal(m.packagingWeight),
    }))
}


export async function createRawMaterial(data: { outletId: string; name: string; sku?: string; unit: string; currentStock?: number; averageCost?: number; packagingWeight?: number }) {
    await requirePermission('inventory', 'create')
    try {
        await prisma.rawMaterial.create({
            data: {
                outletId: data.outletId,
                name: data.name,
                sku: data.sku,
                unit: data.unit,
                currentStock: data.currentStock || 0,
                averageCost: data.averageCost || 0,
                packagingWeight: data.packagingWeight || 0
            }
        })
        revalidatePath('/inventory/materials')
        return { success: true }
    } catch (error) {
        console.error("Failed to create raw material:", error)
        return { success: false, error: "Failed to create raw material" }
    }
}

export async function updateRawMaterial(id: string, data: { name: string; sku?: string; unit: string; currentStock?: number; averageCost?: number; packagingWeight?: number }) {
    await requirePermission('inventory', 'update')
    try {
        await prisma.rawMaterial.update({
            where: { id },
            data: {
                name: data.name,
                sku: data.sku,
                unit: data.unit,
                currentStock: data.currentStock,
                averageCost: data.averageCost,
                packagingWeight: data.packagingWeight
            }
        })
        revalidatePath('/inventory/materials')
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
        revalidatePath('/inventory/materials')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete raw material:", error)
        return { success: false, error: "Failed to delete raw material" }
    }
}

export async function getRawMaterialPurchaseHistory(rawMaterialId: string) {
    await requirePermission('inventory', 'view')
    return prisma.inventoryPurchase.findMany({
        where: { rawMaterialId },
        orderBy: { date: 'desc' },
        select: {
            id: true,
            date: true,
            quantity: true,
            unitPrice: true,
            totalAmount: true,
            supplier: true,
            notes: true,
        }
    })
}

export type StockProjection = {
    avgDailyUsage: number
    projectedDays: number | null   // null = tidak bisa dihitung (data kurang / tidak ada pemakaian)
    status: 'HABIS' | 'KRITIS' | 'SEGERA_BELI' | 'PERHATIKAN' | 'AMAN' | 'NO_DATA'
    lastOpnameDate: string | null
    opnameCount: number
}

function getProjectionStatus(currentStock: number, projectedDays: number | null): StockProjection['status'] {
    if (currentStock <= 0) return 'HABIS'
    if (projectedDays === null) return 'NO_DATA'
    if (projectedDays <= 3) return 'KRITIS'
    if (projectedDays <= 7) return 'SEGERA_BELI'
    if (projectedDays <= 14) return 'PERHATIKAN'
    return 'AMAN'
}

export async function getStockProjections(outletId: string): Promise<Record<string, StockProjection>> {
    await requirePermission('inventory', 'view')

    // Ambil semua StockOpname COMPLETED dalam 90 hari terakhir, beserta items
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const [opnames, materials, orders] = await Promise.all([
        prisma.stockOpname.findMany({
            where: {
                outletId,
                status: 'COMPLETED',
                date: { gte: ninetyDaysAgo }
            },
            include: {
                items: {
                    select: {
                        rawMaterialId: true,
                        systemStock: true,
                        actualStock: true,
                    }
                }
            },
            orderBy: { date: 'asc' }
        }),
        // Ambil semua raw materials untuk currentStock
        prisma.rawMaterial.findMany({
            where: { outletId },
            select: { id: true, currentStock: true }
        }),
        // Ambil tanggal-tanggal yang ada order (untuk exclude hari tanpa order)
        prisma.order.findMany({
            where: {
                outletId,
                createdAt: { gte: ninetyDaysAgo },
                orderStatus: { notIn: ['cancelled'] }
            },
            select: { createdAt: true },
        })
    ])

    // Buat set tanggal yang ada order (format YYYY-MM-DD)
    const orderDateSet = new Set<string>()
    for (const order of orders) {
        const dateKey = order.createdAt.toISOString().split('T')[0]
        orderDateSet.add(dateKey)
    }

    const result: Record<string, StockProjection> = {}

    // Inisialisasi semua material dengan NO_DATA
    for (const mat of materials) {
        result[mat.id] = {
            avgDailyUsage: 0,
            projectedDays: null,
            status: Number(mat.currentStock) <= 0 ? 'HABIS' : 'NO_DATA',
            lastOpnameDate: null,
            opnameCount: 0,
        }
    }

    if (opnames.length < 2) {
        // Butuh minimal 2 opname berurutan untuk menghitung pemakaian
        if (opnames.length === 1) {
            for (const item of opnames[0].items) {
                if (result[item.rawMaterialId]) {
                    result[item.rawMaterialId].lastOpnameDate = opnames[0].date.toISOString()
                    result[item.rawMaterialId].opnameCount = 1
                }
            }
        }
        return result
    }

    // Helper: hitung jumlah hari yang ada order dalam rentang [startDate, endDate]
    function countActiveDays(startDate: Date, endDate: Date): number {
        let count = 0
        const current = new Date(startDate)
        current.setHours(0, 0, 0, 0)
        const end = new Date(endDate)
        end.setHours(0, 0, 0, 0)
        while (current <= end) {
            const key = current.toISOString().split('T')[0]
            if (orderDateSet.has(key)) count++
            current.setDate(current.getDate() + 1)
        }
        return count
    }

    // Kelompokkan items per rawMaterialId per opname
    const materialOpnameHistory = new Map<string, Array<{
        date: Date
        systemStock: number
        actualStock: number
    }>>()

    for (const opname of opnames) {
        for (const item of opname.items) {
            if (!materialOpnameHistory.has(item.rawMaterialId)) {
                materialOpnameHistory.set(item.rawMaterialId, [])
            }
            materialOpnameHistory.get(item.rawMaterialId)!.push({
                date: opname.date,
                systemStock: Number(item.systemStock),
                actualStock: Number(item.actualStock),
            })
        }
    }

    // Hitung weighted average daily usage per material
    for (const [materialId, history] of materialOpnameHistory.entries()) {
        const mat = materials.find(m => m.id === materialId)
        if (!mat) continue

        const currentStock = Number(mat.currentStock)
        const lastOpname = history[history.length - 1]

        if (history.length < 2) {
            result[materialId] = {
                avgDailyUsage: 0,
                projectedDays: null,
                status: currentStock <= 0 ? 'HABIS' : 'NO_DATA',
                lastOpnameDate: lastOpname.date.toISOString(),
                opnameCount: history.length,
            }
            continue
        }

        // Hitung weighted average daily usage dari pasangan opname berurutan
        let totalWeightedUsage = 0
        let totalActiveDays = 0

        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1]
            const curr = history[i]

            // Pemakaian = systemStock - actualStock (positif = terpakai)
            const usage = curr.systemStock - curr.actualStock

            if (usage > 0) {
                // Hitung jumlah hari AKTIF (ada order) dalam periode ini
                // Hari tanpa order tidak dihitung agar rata-rata tidak terdilusi
                const activeDays = countActiveDays(prev.date, curr.date)
                const effectiveDays = Math.max(1, activeDays)

                totalWeightedUsage += usage
                totalActiveDays += effectiveDays
            }
        }

        let avgDailyUsage = 0
        let projectedDays: number | null = null

        if (totalActiveDays > 0 && totalWeightedUsage > 0) {
            avgDailyUsage = totalWeightedUsage / totalActiveDays
            projectedDays = currentStock > 0 ? Math.round(currentStock / avgDailyUsage) : 0
        }

        result[materialId] = {
            avgDailyUsage: Math.round(avgDailyUsage * 100) / 100,
            projectedDays,
            status: getProjectionStatus(currentStock, projectedDays),
            lastOpnameDate: lastOpname.date.toISOString(),
            opnameCount: history.length,
        }
    }

    return result
}

/**
 * Cached version of getStockProjections for dashboard use.
 * Returns cached data if available (TTL 15 min), otherwise calculates and caches.
 */
export async function getCachedStockProjections(outletId: string): Promise<Record<string, StockProjection>> {
    const cacheKey = getProjectionCacheKey(outletId)
    const cached = cacheGet<Record<string, StockProjection>>(cacheKey)
    if (cached) return cached

    const result = await getStockProjections(outletId)
    cacheSet(cacheKey, result)
    return result
}

