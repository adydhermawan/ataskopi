'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export async function getOutlets() {
    await requirePermission('outlets', 'view')
    const outlets = await prisma.outlet.findMany({
        orderBy: { createdAt: 'desc' }
    })

    return outlets
}

export async function createOutlet(data: any) {
    await requirePermission('outlets', 'create')
    try {
        await prisma.outlet.create({
            data: {
                name: data.name,
                address: data.address,
                phone: data.phone,
                operatingHours: data.operatingHours ? { text: data.operatingHours } : undefined,
                latitude: data.latitude,
                longitude: data.longitude,
                isActive: data.isActive ?? true
            }
        })
        revalidatePath('/outlets')
        return { success: true }
    } catch (error) {
        console.error("Failed to create outlet:", error)
        return { success: false, error: "Failed to create outlet" }
    }
}

export async function updateOutlet(id: string, data: any) {
    await requirePermission('outlets', 'update')
    try {
        await prisma.outlet.update({
            where: { id },
            data: {
                name: data.name,
                address: data.address,
                phone: data.phone,
                operatingHours: data.operatingHours ? { text: data.operatingHours } : undefined,
                latitude: data.latitude,
                longitude: data.longitude,
                isActive: data.isActive
            }
        })
        revalidatePath('/outlets')
        return { success: true }
    } catch (error) {
        console.error("Failed to update outlet:", error)
        return { success: false, error: "Failed to update outlet" }
    }
}

export async function deleteOutlet(id: string) {
    await requirePermission('outlets', 'delete')
    try {
        await prisma.outlet.delete({
            where: { id }
        })
        revalidatePath('/outlets')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete outlet:", error)
        return { success: false, error: "Failed to delete outlet" }
    }
}
