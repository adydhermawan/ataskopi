'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"
import bcrypt from "bcryptjs"

export async function createStaff(data: {
    name: string
    phone: string
    pin: string
    role: string
    outletId: string | null
}) {
    await requirePermission('settings', 'create')
    try {
        const pinHash = await bcrypt.hash(data.pin, 10)

        await prisma.user.create({
            data: {
                name: data.name,
                phone: data.phone,
                pinHash,
                role: data.role,
                outletId: data.outletId
            }
        })

        revalidatePath('/staff')
        return { success: true }
    } catch (error: any) {
        console.error("Failed to create staff:", error)
        if (error.code === 'P2002') {
            return { success: false, error: "Phone number already registered" }
        }
        return { success: false, error: "Failed to create staff" }
    }
}

export async function getStaff() {
    await requirePermission('settings', 'view')
    return await prisma.user.findMany({
        where: {
            role: {
                in: ['admin', 'owner', 'kasir']
            }
        },
        include: {
            outlet: true
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function updateStaffOutlet(userId: string, outletId: string | null) {
    await requirePermission('settings', 'update')
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { outletId }
        })
        revalidatePath('/staff')
        return { success: true }
    } catch (error) {
        console.error("Failed to update staff outlet:", error)
        return { success: false, error: "Failed to update staff outlet" }
    }
}

export async function updateStaffRole(userId: string, role: string) {
    await requirePermission('settings', 'update')
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role }
        })
        revalidatePath('/staff')
        return { success: true }
    } catch (error) {
        console.error("Failed to update staff role:", error)
        return { success: false, error: "Failed to update staff role" }
    }
}
