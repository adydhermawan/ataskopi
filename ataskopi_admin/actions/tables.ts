'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export async function getTables(outletId: string) {
    await requirePermission('outlets', 'view')
    return await prisma.table.findMany({
        where: { outletId },
        orderBy: { tableNumber: 'asc' }
    })
}

export async function createTable(data: { outletId: string; tableNumber: string; qrCode: string }) {
    await requirePermission('outlets', 'update')
    try {
        await prisma.table.create({
            data: {
                outletId: data.outletId,
                tableNumber: data.tableNumber,
                qrCode: data.qrCode,
                isOccupied: false
            }
        })
        revalidatePath(`/outlets/${data.outletId}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to create table:", error)
        return { success: false, error: "Failed to create table" }
    }
}

export async function updateTable(id: string, data: { tableNumber: string; qrCode: string }) {
    await requirePermission('outlets', 'update')
    try {
        const table = await prisma.table.update({
            where: { id },
            data: {
                tableNumber: data.tableNumber,
                qrCode: data.qrCode
            }
        })
        revalidatePath(`/outlets/${table.outletId}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to update table:", error)
        return { success: false, error: "Failed to update table" }
    }
}

export async function deleteTable(id: string) {
    await requirePermission('outlets', 'update')
    try {
        const table = await prisma.table.delete({
            where: { id }
        })
        revalidatePath(`/outlets/${table.outletId}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to delete table:", error)
        return { success: false, error: "Failed to delete table" }
    }
}
