'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

// Type definition for creating/updating
type VoucherData = {
    code: string
    description?: string,
    discountType: "FIXED" | "PERCENT"
    discountValue: number
    maxDiscount?: number
    minOrder?: number
    startDate?: Date
    endDate?: Date
    usageLimit?: number
    // Advanced
    userUsageLimit?: number
    validOrderTypes?: string[]
    validProductIds?: string[]
    validCategoryIds?: string[]
    customerEligibility?: string
    eligibleUserIds?: string[]
}

export async function getVouchers() {
    await requirePermission('marketing', 'view')

    // Sort by creation date desc
    const vouchers = await prisma.voucher.findMany({
        orderBy: { createdAt: 'desc' }
    })

    // Serialize Decimal types for client components
    return vouchers.map(voucher => ({
        ...voucher,
        discountValue: Number(voucher.discountValue),
        maxDiscount: voucher.maxDiscount ? Number(voucher.maxDiscount) : null,
        minOrder: voucher.minOrder ? Number(voucher.minOrder) : null,
    }))
}

export async function createVoucher(data: VoucherData) {
    await requirePermission('marketing', 'create')

    try {
        await prisma.voucher.create({
            data: {
                code: data.code.toUpperCase(),
                description: data.description,
                discountType: data.discountType,
                discountValue: data.discountValue,
                maxDiscount: data.maxDiscount,
                minOrder: data.minOrder,
                startDate: data.startDate,
                endDate: data.endDate,
                usageLimit: data.usageLimit,
                userUsageLimit: data.userUsageLimit,
                validOrderTypes: data.validOrderTypes,
                validProductIds: data.validProductIds,
                validCategoryIds: data.validCategoryIds,
                customerEligibility: data.customerEligibility,
                eligibleUserIds: data.eligibleUserIds,
                isActive: true
            }
        })
        revalidatePath('/marketing/vouchers')
        return { success: true }
    } catch (error) {
        console.error("Failed to create voucher:", error)
        // Check for unique code constraint
        if ((error as any).code === 'P2002') {
            return { success: false, error: "Voucher code already exists" }
        }
        return { success: false, error: "Failed to create voucher" }
    }
}

export async function updateVoucher(id: string, data: Partial<VoucherData> & { isActive?: boolean }) {
    await requirePermission('marketing', 'update')

    try {
        await prisma.voucher.update({
            where: { id },
            data: {
                code: data.code?.toUpperCase(),
                description: data.description,
                discountType: data.discountType,
                discountValue: data.discountValue,
                maxDiscount: data.maxDiscount,
                minOrder: data.minOrder,
                startDate: data.startDate,
                endDate: data.endDate,
                usageLimit: data.usageLimit,
                userUsageLimit: data.userUsageLimit,
                validOrderTypes: data.validOrderTypes,
                validProductIds: data.validProductIds,
                validCategoryIds: data.validCategoryIds,
                customerEligibility: data.customerEligibility,
                eligibleUserIds: data.eligibleUserIds,
                isActive: data.isActive
            }
        })
        revalidatePath('/marketing/vouchers')
        return { success: true }
    } catch (error) {
        console.error("Failed to update voucher:", error)
        // Log detailed error for debugging
        if (error instanceof Error) {
            console.error("Error message:", error.message)
            console.error("Error stack:", error.stack)
        }
        return { success: false, error: `Failed to update voucher: ${error instanceof Error ? error.message : "Unknown error"}` }
    }
}

export async function deleteVoucher(id: string) {
    await requirePermission('marketing', 'delete')

    try {
        await prisma.voucher.delete({
            where: { id }
        })
        revalidatePath('/marketing/vouchers')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete voucher:", error)
        return { success: false, error: "Failed to delete voucher" }
    }
}
