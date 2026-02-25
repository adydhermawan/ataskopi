'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

type PromoData = {
    title: string
    description?: string
    bannerUrl: string
    linkUrl?: string
    isActive?: boolean
    displayOrder?: number
}

export async function getPromos() {
    await requirePermission('marketing', 'view')

    const promos = await prisma.promo.findMany({
        orderBy: { displayOrder: 'asc' }
    })

    return promos
}

export async function createPromo(data: PromoData) {
    await requirePermission('marketing', 'create')

    try {
        await prisma.promo.create({
            data: {
                title: data.title,
                description: data.description,
                bannerUrl: data.bannerUrl,
                linkUrl: data.linkUrl,
                isActive: data.isActive ?? true,
                displayOrder: data.displayOrder ?? 0
            }
        })
        revalidatePath('/marketing/promos')
        return { success: true }
    } catch (error) {
        console.error("Failed to create promo:", error)
        return { success: false, error: "Failed to create promo" }
    }
}

export async function updatePromo(id: string, data: Partial<PromoData>) {
    await requirePermission('marketing', 'update')

    try {
        await prisma.promo.update({
            where: { id },
            data
        })
        revalidatePath('/marketing/promos')
        return { success: true }
    } catch (error) {
        console.error("Failed to update promo:", error)
        return { success: false, error: "Failed to update promo" }
    }
}

export async function deletePromo(id: string) {
    await requirePermission('marketing', 'delete')

    try {
        await prisma.promo.delete({
            where: { id }
        })
        revalidatePath('/marketing/promos')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete promo:", error)
        return { success: false, error: "Failed to delete promo" }
    }
}
