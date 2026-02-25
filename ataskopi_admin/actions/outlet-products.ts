'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export async function getOutletProducts(outletId: string) {
    await requirePermission('outlets', 'view')
    const outletProducts = await prisma.outletProduct.findMany({
        where: { outletId },
        include: { product: true }
    })
    return outletProducts
}

export async function updateOutletProductStatus(outletId: string, productId: string, isAvailable: boolean) {
    await requirePermission('outlets', 'update')
    try {
        await prisma.outletProduct.upsert({
            where: {
                outletId_productId: {
                    outletId,
                    productId
                }
            },
            create: {
                outletId,
                productId,
                isAvailable
            },
            update: {
                isAvailable
            }
        })
        revalidatePath(`/outlets/${outletId}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to update outlet product status:", error)
        return { success: false, error: "Failed to update status" }
    }
}
