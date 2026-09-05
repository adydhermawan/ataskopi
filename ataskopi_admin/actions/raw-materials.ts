'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"
import { cacheGet, cacheSet, getProjectionCacheKey, invalidateProjectionCache } from "@/lib/cache/projection-cache"
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
        const currentStock = data.currentStock || 0
        const averageCost = data.averageCost || 0
        const totalAmount = currentStock * averageCost

        await prisma.$transaction(async (tx) => {
            // 1. Buat RawMaterial
            const material = await tx.rawMaterial.create({
                data: {
                    outletId: data.outletId,
                    name: data.name,
                    sku: data.sku,
                    unit: data.unit,
                    currentStock: currentStock,
                    averageCost: averageCost,
                    packagingWeight: data.packagingWeight || 0
                }
            })

            // 2. Jika ada stok awal, catat sebagai Pembelian Lunas
            if (currentStock > 0 && averageCost > 0) {
                await tx.inventoryPurchase.create({
                    data: {
                        outletId: data.outletId,
                        rawMaterialId: material.id,
                        date: new Date(),
                        quantity: currentStock,
                        unitPrice: averageCost,
                        totalAmount: totalAmount,
                        supplier: "Initial Stock",
                        notes: "Stok awal saat input bahan baku",
                        paymentMethod: "CASH",
                        paymentStatus: "PAID",
                        paidAt: new Date(),
                        deliveryStatus: "RECEIVED",
                        receivedAt: new Date(),
                    }
                })
            }
        })

        revalidatePath('/inventory/materials')
        revalidatePath('/inventory/purchases')
        revalidatePath('/finance/cash-flow')
        revalidatePath('/finance/balance-sheet')
        invalidateProjectionCache(data.outletId)
        return { success: true }
    } catch (error) {
        console.error("Failed to create raw material:", error)
        return { success: false, error: "Failed to create raw material" }
    }
}

export async function updateRawMaterial(id: string, data: { name: string; sku?: string; unit: string; currentStock?: number; averageCost?: number; packagingWeight?: number }) {
    await requirePermission('inventory', 'update')
    try {
        const material = await prisma.rawMaterial.update({
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
        if (material?.outletId) invalidateProjectionCache(material.outletId)
        return { success: true }
    } catch (error) {
        console.error("Failed to update raw material:", error)
        return { success: false, error: "Failed to update raw material" }
    }
}

export async function deleteRawMaterial(id: string) {
    await requirePermission('inventory', 'delete')
    try {
        const material = await prisma.rawMaterial.findUnique({
            where: { id },
            select: { outletId: true }
        })
        await prisma.rawMaterial.delete({
            where: { id }
        })
        revalidatePath('/inventory/materials')
        if (material?.outletId) invalidateProjectionCache(material.outletId)
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
    estimatedStock: number | null  // Sisa stok terproyeksi saat ini
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

    const [opnames, materials, orders, purchases] = await Promise.all([
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
        // Ambil semua raw materials untuk currentStock & createdAt
        prisma.rawMaterial.findMany({
            where: { outletId },
            select: { id: true, currentStock: true, createdAt: true }
        }),
        // Ambil tanggal-tanggal yang ada order (untuk exclude hari tanpa order)
        prisma.order.findMany({
            where: {
                outletId,
                createdAt: { gte: ninetyDaysAgo },
                orderStatus: { notIn: ['cancelled'] }
            },
            select: { createdAt: true },
        }),
        // Ambil semua riwayat pembelian yang RECEIVED dalam 90 hari terakhir
        prisma.inventoryPurchase.findMany({
            where: {
                outletId,
                deliveryStatus: 'RECEIVED',
                date: { gte: ninetyDaysAgo }
            },
            select: {
                rawMaterialId: true,
                date: true,
                quantity: true,
            },
            orderBy: { date: 'asc' }
        })
    ])

    // Buat set tanggal yang ada order (format YYYY-MM-DD)
    const orderDateSet = new Set<string>()
    for (const order of orders) {
        const dateKey = order.createdAt.toISOString().split('T')[0]
        orderDateSet.add(dateKey)
    }

    // Kelompokkan purchases per rawMaterialId
    const materialPurchases = new Map<string, Array<{ date: Date; quantity: number }>>()
    for (const p of purchases) {
        if (!materialPurchases.has(p.rawMaterialId)) {
            materialPurchases.set(p.rawMaterialId, [])
        }
        materialPurchases.get(p.rawMaterialId)!.push({
            date: p.date,
            quantity: Number(p.quantity)
        })
    }

    const result: Record<string, StockProjection> = {}

    // Inisialisasi semua material dengan NO_DATA
    for (const mat of materials) {
        result[mat.id] = {
            avgDailyUsage: 0,
            projectedDays: null,
            estimatedStock: Number(mat.currentStock),
            status: Number(mat.currentStock) <= 0 ? 'HABIS' : 'NO_DATA',
            lastOpnameDate: null,
            opnameCount: 0,
        }
    }

    if (opnames.length === 0) {
        return result
    }

    function toDateString(d: Date | string): string {
        return new Date(d).toISOString().split('T')[0]
    }

    // Helper: hitung jumlah hari aktif (ada order) dalam rentang [startDate, endDate]
    function countActiveDays(startDate: Date | string, endDate: Date | string): number {
        const startStr = toDateString(startDate)
        const endStr = toDateString(endDate)
        if (startStr > endStr) return 0

        const current = new Date(startStr + 'T00:00:00.000Z')
        const end = new Date(endStr + 'T00:00:00.000Z')

        let count = 0
        while (current <= end) {
            const key = current.toISOString().split('T')[0]
            if (orderDateSet.size > 0) {
                if (orderDateSet.has(key)) count++
            } else {
                count++
            }
            current.setUTCDate(current.getUTCDate() + 1)
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
    for (const mat of materials) {
        const materialId = mat.id
        const currentStock = Number(mat.currentStock)
        const history = materialOpnameHistory.get(materialId) || []
        const purchasesList = materialPurchases.get(materialId) || []

        if (history.length === 0) {
            continue
        }

        const lastOpname = history[history.length - 1]

        // Tanggal pertama produk ini memiliki stok (pembelian pertama atau tanggal dibuatnya material)
        const firstPurchaseDate = purchasesList.length > 0 ? purchasesList[0].date : mat.createdAt

        let totalWeightedUsage = 0
        let totalActiveDays = 0

        // 1. Periode Awal: Dari pertama kali barang dibeli / ada stok sampai Opname Pertama
        const firstOpname = history[0]
        const firstOpnameUsage = firstOpname.systemStock - firstOpname.actualStock

        if (firstOpnameUsage > 0) {
            // Periode dimulai dari firstPurchaseDate atau tanggal opname pertama jika firstPurchaseDate lebih baru
            const startDate = new Date(firstPurchaseDate) <= new Date(firstOpname.date)
                ? firstPurchaseDate
                : firstOpname.date

            const activeDays = countActiveDays(startDate, firstOpname.date)
            const effectiveDays = Math.max(1, activeDays)

            totalWeightedUsage += firstOpnameUsage
            totalActiveDays += effectiveDays
        }

        // 2. Periode Lanjutan: Dari pasangan opname berurutan (i-1 ke i)
        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1]
            const curr = history[i]

            // Pemakaian = systemStock - actualStock (positif = terpakai)
            const usage = curr.systemStock - curr.actualStock

            if (usage > 0) {
                let startDate = prev.date

                // Jika pada opname sebelumnya stok 0, pemakaian baru dimulai saat ada pembelian pertama di periode tersebut
                if (prev.actualStock === 0) {
                    const purchaseInPeriod = purchasesList.find(p => 
                        new Date(p.date) > new Date(prev.date) && new Date(p.date) <= new Date(curr.date)
                    )
                    if (purchaseInPeriod) {
                        startDate = purchaseInPeriod.date
                    }
                }

                const activeDays = countActiveDays(startDate, curr.date)
                const effectiveDays = Math.max(1, activeDays)

                totalWeightedUsage += usage
                totalActiveDays += effectiveDays
            }
        }

        let avgDailyUsage = 0
        let projectedDays: number | null = null
        let estimatedStock: number | null = currentStock
        let status: StockProjection['status'] = currentStock <= 0 ? 'HABIS' : 'NO_DATA'

        if (totalActiveDays > 0 && totalWeightedUsage > 0) {
            avgDailyUsage = totalWeightedUsage / totalActiveDays

            // Hitung jumlah hari aktif sejak opname terakhir sampai hari ini
            const now = new Date()
            const dayAfterLastOpname = new Date(lastOpname.date)
            dayAfterLastOpname.setDate(dayAfterLastOpname.getDate() + 1)
            
            const activeDaysSinceLastOpname = countActiveDays(dayAfterLastOpname, now)

            // Estimasi sisa stok berjalan hari ini
            estimatedStock = Math.max(0, Math.round((currentStock - (activeDaysSinceLastOpname * avgDailyUsage)) * 100) / 100)

            projectedDays = estimatedStock > 0 ? Math.round(estimatedStock / avgDailyUsage) : 0
            status = getProjectionStatus(estimatedStock, projectedDays)
        } else {
            status = getProjectionStatus(currentStock, projectedDays)
        }

        result[materialId] = {
            avgDailyUsage: Math.round(avgDailyUsage * 100) / 100,
            projectedDays,
            estimatedStock,
            status,
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

