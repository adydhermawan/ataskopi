'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export async function getTiers() {
    await requirePermission('marketing', 'view')
    return await prisma.membershipTier.findMany({
        orderBy: { tierLevel: 'asc' }
    })
}

export async function createTier(data: {
    tierLevel: number
    tierName: string
    minPoints: number
    maxPoints?: number
    benefitsDescription?: string
}) {
    await requirePermission('marketing', 'create')
    try {
        await prisma.membershipTier.create({
            data
        })
        revalidatePath('/marketing/loyalty')
        return { success: true }
    } catch (error) {
        console.error("Failed to create tier:", error)
        return { success: false, error: "Failed to create tier" }
    }
}

export async function updateTier(id: string, data: {
    tierLevel?: number
    tierName?: string
    minPoints?: number
    maxPoints?: number
    benefitsDescription?: string
}) {
    await requirePermission('marketing', 'update')
    try {
        await prisma.membershipTier.update({
            where: { id },
            data
        })
        revalidatePath('/marketing/loyalty')
        return { success: true }
    } catch (error) {
        console.error("Failed to update tier:", error)
        return { success: false, error: "Failed to update tier" }
    }
}

export async function deleteTier(id: string) {
    await requirePermission('marketing', 'delete')
    try {
        await prisma.membershipTier.delete({
            where: { id }
        })
        revalidatePath('/marketing/loyalty')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete tier:", error)
        return { success: false, error: "Failed to delete tier" }
    }
}
