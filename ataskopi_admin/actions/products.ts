'use server'

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth-utils"

export type ProductWithRelations = Awaited<ReturnType<typeof getProducts>>[number]

export async function getProducts(searchQuery?: string) {
    // View permission check
    await requirePermission('products', 'view')
    const where: any = {}

    if (searchQuery) {
        where.OR = [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
        ]
    }

    const products = await prisma.product.findMany({
        where,
        include: {
            category: true,
            options: {
                include: {
                    values: {
                        orderBy: { sortOrder: 'asc' }
                    }
                },
                orderBy: { sortOrder: 'asc' }
            },
            modifiers: {
                orderBy: { sortOrder: 'asc' }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return products
}

export async function createProduct(data: any) {
    // Permission check
    await requirePermission('products', 'create')

    try {
        await prisma.product.create({
            data: {
                categoryId: data.categoryId,
                name: data.name,
                description: data.description,
                basePrice: data.basePrice,
                isAvailable: data.isAvailable,
                isRecommended: data.isRecommended,
                options: {
                    create: data.options?.map((opt: any, idx: number) => ({
                        name: opt.name,
                        minSelect: opt.minSelect,
                        maxSelect: opt.maxSelect,
                        sortOrder: idx + 1,
                        values: {
                            create: opt.values.map((val: any, vIdx: number) => ({
                                name: val.name,
                                priceModifier: val.priceModifier,
                                sortOrder: vIdx + 1
                            }))
                        }
                    }))
                },
                modifiers: {
                    create: data.modifiers?.map((mod: any, idx: number) => ({
                        name: mod.name,
                        price: mod.price,
                        isAvailable: mod.isAvailable,
                        sortOrder: idx + 1
                    }))
                }
            }
        })
        revalidatePath('/products')
        return { success: true }
    } catch (error) {
        console.error("Failed to create product:", error)
        return { success: false, error: "Failed to create product" }
    }
}

export async function updateProduct(id: string, data: any) {
    // Permission check
    await requirePermission('products', 'update')

    try {
        await prisma.$transaction(async (tx) => {
            // Update basic fields
            await tx.product.update({
                where: { id },
                data: {
                    categoryId: data.categoryId,
                    name: data.name,
                    description: data.description,
                    basePrice: data.basePrice,
                    isAvailable: data.isAvailable,
                    isRecommended: data.isRecommended,
                }
            })

            // Delete existing relations
            const existingOptions = await tx.productOption.findMany({ where: { productId: id } })
            for (const opt of existingOptions) {
                await tx.productOptionValue.deleteMany({ where: { optionId: opt.id } })
            }
            await tx.productOption.deleteMany({ where: { productId: id } })
            await tx.productModifier.deleteMany({ where: { productId: id } })

            // Re-create Options
            if (data.options && data.options.length > 0) {
                for (let i = 0; i < data.options.length; i++) {
                    const opt = data.options[i];
                    await tx.productOption.create({
                        data: {
                            productId: id,
                            name: opt.name,
                            minSelect: opt.minSelect,
                            maxSelect: opt.maxSelect,
                            sortOrder: i + 1,
                            values: {
                                create: opt.values.map((val: any, vIdx: number) => ({
                                    name: val.name,
                                    priceModifier: val.priceModifier,
                                    sortOrder: vIdx + 1,
                                    isDefault: val.isDefault || false
                                }))
                            }
                        }
                    })
                }
            }

            // Re-create Modifiers
            if (data.modifiers && data.modifiers.length > 0) {
                for (let i = 0; i < data.modifiers.length; i++) {
                    const mod = data.modifiers[i];
                    await tx.productModifier.create({
                        data: {
                            productId: id,
                            name: mod.name,
                            price: mod.price,
                            isAvailable: mod.isAvailable,
                            sortOrder: i + 1
                        }
                    })
                }
            }
        })

        revalidatePath('/products')
        revalidatePath(`/products/${id}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to update product:", error)
        return { success: false, error: "Failed to update product" }
    }
}

export async function deleteProduct(id: string) {
    // Permission check
    await requirePermission('products', 'delete')

    try {
        const product = await prisma.product.findUnique({
            where: { id },
            include: { options: { include: { values: true } }, modifiers: true }
        })

        if (!product) return { success: false, error: "Product not found" }

        // 1. Check if product is used in any orders
        const orderCount = await prisma.orderItem.count({
            where: { productId: id }
        })

        if (orderCount > 0) {
            return {
                success: false,
                error: `Cannot delete product. It has been ordered ${orderCount} times. Consider archiving it instead.`
            }
        }

        // 2. Transaction to clean up all relations
        await prisma.$transaction(async (tx) => {
            // Delete Outlet Products (Inventory links)
            await tx.outletProduct.deleteMany({ where: { productId: id } })

            // Delete values
            for (const opt of product.options) {
                await tx.productOptionValue.deleteMany({ where: { optionId: opt.id } })
            }
            // Delete options
            await tx.productOption.deleteMany({ where: { productId: id } })
            // Delete modifiers
            await tx.productModifier.deleteMany({ where: { productId: id } })

            // Delete product
            await tx.product.delete({
                where: { id }
            })
        })

        revalidatePath('/products')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete product:', error)
        return { success: false, error: 'Failed to delete product' }
    }
}
