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
                where: { isAvailable: true },
                include: {
                    values: {
                        where: { isAvailable: true },
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
    } catch (error: any) {
        console.error("Failed to create product:", error)
        return { success: false, error: error?.message || "Failed to create product" }
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

            // Diff and update options and values to avoid foreign key errors on ordered items
            const existingOptions = await tx.productOption.findMany({
                where: { productId: id },
                include: { values: true },
            });

            const incomingOptionIds = new Set((data.options || []).map((o: any) => o.id).filter(Boolean));
            const incomingValueIds = new Set(
                (data.options || []).flatMap((o: any) => o.values || []).map((v: any) => v.id).filter(Boolean)
            );

            // Deletions / Soft-deletions of old options
            for (const extOpt of existingOptions) {
                if (!incomingOptionIds.has(extOpt.id)) {
                    // Option was removed. Check if any value has been ordered.
                    const valIds = extOpt.values.map(v => v.id);
                    const orderCount = valIds.length > 0 ? await tx.orderItemOption.count({
                        where: { optionValueId: { in: valIds } }
                    }) : 0;

                    if (orderCount > 0) {
                        // Soft delete
                        await tx.productOption.update({
                            where: { id: extOpt.id },
                            data: { isAvailable: false },
                        });
                        await tx.productOptionValue.updateMany({
                            where: { optionId: extOpt.id },
                            data: { isAvailable: false },
                        });
                    } else {
                        // Hard delete
                        if (valIds.length > 0) {
                            await tx.productOptionValue.deleteMany({
                                where: { id: { in: valIds } },
                            });
                        }
                        await tx.productOption.delete({
                            where: { id: extOpt.id },
                        });
                    }
                } else {
                    // Option is kept. Check if any value was removed.
                    for (const extVal of extOpt.values) {
                        if (!incomingValueIds.has(extVal.id)) {
                            // Value was removed. Check if ordered.
                            const orderCount = await tx.orderItemOption.count({
                                where: { optionValueId: extVal.id }
                            });
                            if (orderCount > 0) {
                                // Soft delete value
                                await tx.productOptionValue.update({
                                    where: { id: extVal.id },
                                    data: { isAvailable: false },
                                });
                            } else {
                                // Hard delete value
                                await tx.productOptionValue.delete({
                                    where: { id: extVal.id },
                                });
                            }
                        }
                    }
                }
            }

            // Create or update incoming options
            if (data.options && data.options.length > 0) {
                for (let i = 0; i < data.options.length; i++) {
                    const opt = data.options[i];
                    let optionId = opt.id;

                    if (optionId) {
                        // Update existing option
                        await tx.productOption.update({
                            where: { id: optionId },
                            data: {
                                name: opt.name,
                                minSelect: Number(opt.minSelect || 1),
                                maxSelect: Number(opt.maxSelect || 1),
                                sortOrder: i + 1,
                                isAvailable: true,
                            }
                        });
                    } else {
                        // Create new option
                        const createdOption = await tx.productOption.create({
                            data: {
                                productId: id,
                                name: opt.name,
                                minSelect: Number(opt.minSelect || 1),
                                maxSelect: Number(opt.maxSelect || 1),
                                sortOrder: i + 1,
                                isAvailable: true,
                            }
                        });
                        optionId = createdOption.id;
                    }

                    // Create or update values
                    if (opt.values && opt.values.length > 0) {
                        for (let j = 0; j < opt.values.length; j++) {
                            const val = opt.values[j];
                            if (val.id) {
                                // Update existing value
                                await tx.productOptionValue.update({
                                    where: { id: val.id },
                                    data: {
                                        optionId: optionId,
                                        name: val.name,
                                        priceModifier: Number(val.priceModifier || 0),
                                        isDefault: !!val.isDefault,
                                        sortOrder: j + 1,
                                        isAvailable: true,
                                    }
                                });
                            } else {
                                // Create new value
                                await tx.productOptionValue.create({
                                    data: {
                                        optionId: optionId,
                                        name: val.name,
                                        priceModifier: Number(val.priceModifier || 0),
                                        isDefault: !!val.isDefault,
                                        sortOrder: j + 1,
                                        isAvailable: true,
                                    }
                                });
                            }
                        }
                    }
                }
            }

            // Re-create Modifiers
            await tx.productModifier.deleteMany({ where: { productId: id } })
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
    } catch (error: any) {
        console.error("Failed to update product:", error)
        return { success: false, error: error?.message || "Failed to update product" }
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
