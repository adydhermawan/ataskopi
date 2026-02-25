'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export async function getLoyaltySettings() {
    await requirePermission('settings', 'view')

    const settings = await prisma.loyaltySetting.findFirst()

    // Return default if not found (or should we create one seed?)
    // Better to return null or default structure
    return settings
}

export async function updateLoyaltySettings(data: any) {
    await requirePermission('settings', 'update') // Assuming 'settings' permission covers this

    try {
        const existing = await prisma.loyaltySetting.findFirst()

        if (existing) {
            await prisma.loyaltySetting.update({
                where: { id: existing.id },
                data: {
                    isEnabled: data.isEnabled,
                    pointsPerItem: data.pointsPerItem,
                    pointValueIdr: data.pointValueIdr,
                    minPointsToRedeem: data.minPointsToRedeem,
                    maxPointsPerTransaction: data.maxPointsPerTransaction,
                    maxRedemptionPercentage: data.maxRedemptionPercentage
                }
            })
        } else {
            // First time setup
            await prisma.loyaltySetting.create({
                data: {
                    isEnabled: data.isEnabled ?? true,
                    pointsPerItem: data.pointsPerItem ?? 1,
                    pointValueIdr: data.pointValueIdr ?? 1000,
                    minPointsToRedeem: data.minPointsToRedeem ?? 10,
                    maxPointsPerTransaction: data.maxPointsPerTransaction,
                    maxRedemptionPercentage: data.maxRedemptionPercentage ?? 50
                }
            })
        }

        revalidatePath('/marketing/loyalty')
        return { success: true }
    } catch (error) {
        console.error("Failed to update loyalty settings:", error)
        return { success: false, error: "Failed to update loyalty settings" }
    }
}
