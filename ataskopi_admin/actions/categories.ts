'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export async function getCategories() {
    await requirePermission('categories', 'view')
    const categories = await prisma.category.findMany({
        orderBy: { sortOrder: 'asc' }
    })

    return categories
}

export async function createCategory(data: { name: string; slug: string; sortOrder?: number }) {
    await requirePermission('categories', 'create')
    try {
        await prisma.category.create({
            data: {
                name: data.name,
                slug: data.slug,
                sortOrder: data.sortOrder || 0
            }
        })
        revalidatePath('/categories')
        return { success: true }
    } catch (error) {
        console.error("Failed to create category:", error)
        return { success: false, error: "Failed to create category" }
    }
}

export async function updateCategory(id: string, data: { name: string; slug: string; sortOrder?: number }) {
    await requirePermission('categories', 'update')
    try {
        await prisma.category.update({
            where: { id },
            data: {
                name: data.name,
                slug: data.slug,
                sortOrder: data.sortOrder || 0
            }
        })
        revalidatePath('/categories')
        return { success: true }
    } catch (error) {
        console.error("Failed to update category:", error)
        return { success: false, error: "Failed to update category" }
    }
}

export async function deleteCategory(id: string) {
    await requirePermission('categories', 'delete')
    try {
        await prisma.category.delete({
            where: { id }
        })
        revalidatePath('/categories')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete category:", error)
        return { success: false, error: "Failed to delete category" }
    }
}
