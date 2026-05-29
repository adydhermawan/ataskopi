'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export async function getOrderModeSettings() {
    await requirePermission('settings', 'view')

    let settings = await prisma.orderModeSetting.findFirst()

    if (!settings) {
        // Return a default object if none exists yet
        settings = await prisma.orderModeSetting.create({
            data: {
                dineIn: true,
                pickup: true,
                delivery: true,
                dineInMethod: 'SCAN_ONLY',
            }
        })
    }

    return settings
}

export async function updateOrderModeSettings(data: {
    dineIn: boolean
    pickup: boolean
    delivery: boolean
    dineInMethod: string
}) {
    await requirePermission('settings', 'update')

    try {
        const existing = await prisma.orderModeSetting.findFirst()

        if (existing) {
            await prisma.orderModeSetting.update({
                where: { id: existing.id },
                data: {
                    dineIn: data.dineIn,
                    pickup: data.pickup,
                    delivery: data.delivery,
                    dineInMethod: data.dineInMethod,
                }
            })
        } else {
            await prisma.orderModeSetting.create({
                data: {
                    dineIn: data.dineIn,
                    pickup: data.pickup,
                    delivery: data.delivery,
                    dineInMethod: data.dineInMethod,
                }
            })
        }

        revalidatePath('/settings')
        return { success: true }
    } catch (error) {
        console.error("Failed to update order mode settings:", error)
        return { success: false, error: "Failed to update order mode settings" }
    }
}
