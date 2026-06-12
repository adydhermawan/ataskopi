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
                taxEnabled: true,
                qrisEnabled: true,
                cashEnabled: true,
                defaultPaymentMethod: 'qris',
                qrisQrCodeUrl: null,
                dailyCurationsEnabled: true,
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
    taxEnabled: boolean
    qrisEnabled: boolean
    cashEnabled: boolean
    defaultPaymentMethod: string
    qrisQrCodeUrl: string | null
    dailyCurationsEnabled: boolean
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
                    taxEnabled: data.taxEnabled,
                    qrisEnabled: data.qrisEnabled,
                    cashEnabled: data.cashEnabled,
                    defaultPaymentMethod: data.defaultPaymentMethod,
                    qrisQrCodeUrl: data.qrisQrCodeUrl,
                    dailyCurationsEnabled: data.dailyCurationsEnabled,
                }
            })
        } else {
            await prisma.orderModeSetting.create({
                data: {
                    dineIn: data.dineIn,
                    pickup: data.pickup,
                    delivery: data.delivery,
                    dineInMethod: data.dineInMethod,
                    taxEnabled: data.taxEnabled,
                    qrisEnabled: data.qrisEnabled,
                    cashEnabled: data.cashEnabled,
                    defaultPaymentMethod: data.defaultPaymentMethod,
                    qrisQrCodeUrl: data.qrisQrCodeUrl,
                    dailyCurationsEnabled: data.dailyCurationsEnabled,
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
