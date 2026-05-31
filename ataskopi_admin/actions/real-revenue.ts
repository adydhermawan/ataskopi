'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission, getCurrentUser } from "@/lib/auth-utils"
import { saveRealRevenueSchema } from "@/lib/validation/real-revenue-schemas"

export async function getDailyRealRevenues(outletId?: string | null, days: number = 30) {
    const user = await requirePermission('real_revenue', 'view')

    const where: any = {}

    // Lock cashier to their assigned outlet
    if (user.role === 'kasir') {
        if (user.outletId) {
            where.outletId = user.outletId
        } else {
            return [] // Kasir with no outlet assigned has no access to logs
        }
    } else if (outletId) {
        where.outletId = outletId
    }

    const records = await prisma.dailyRealRevenue.findMany({
        where,
        include: {
            outlet: true
        },
        orderBy: {
            date: 'desc'
        },
        take: days
    })

    return records.map(r => ({
        id: r.id,
        date: r.date.toISOString().split('T')[0], // yyyy-mm-dd format
        outletId: r.outletId,
        outletName: r.outlet.name,
        amount: Number(r.amount),
        notes: r.notes,
        createdAt: r.createdAt.toISOString()
    }))
}

export async function saveDailyRealRevenue(rawData: any) {
    const user = await requirePermission('real_revenue', 'create')

    const validation = saveRealRevenueSchema.safeParse(rawData)
    if (!validation.success) {
        return { success: false, error: validation.error.issues[0].message }
    }

    const { id, date, outletId, amount, notes } = validation.data

    // If kasir, ensure they can only log for their assigned outlet
    if (user.role === 'kasir' && user.outletId !== outletId) {
        return { success: false, error: "Unauthorized: You can only record revenue for your assigned outlet." }
    }

    const dateKey = new Date(date + "T00:00:00Z")

    try {
        if (id) {
            // Edit existing entry
            await prisma.dailyRealRevenue.update({
                where: { id },
                data: {
                    date: dateKey,
                    outletId,
                    amount,
                    notes: notes || null
                }
            })
        } else {
            // Upsert / Create new entry
            await prisma.dailyRealRevenue.upsert({
                where: {
                    date_outletId: {
                        date: dateKey,
                        outletId
                    }
                },
                create: {
                    date: dateKey,
                    outletId,
                    amount,
                    notes: notes || null
                },
                update: {
                    amount,
                    notes: notes || null
                }
            })
        }

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to save daily real revenue:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to save daily real revenue" }
    }
}

export async function deleteDailyRealRevenue(id: string) {
    await requirePermission('real_revenue', 'delete')

    try {
        await prisma.dailyRealRevenue.delete({
            where: { id }
        })
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete daily real revenue:", error)
        return { success: false, error: "Failed to delete daily real revenue" }
    }
}
