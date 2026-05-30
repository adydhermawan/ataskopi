"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createProduct(data: any) {
    try {
        const { basePrice, options, modifiers, ...rest } = data;
        
        await db.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    ...rest,
                    basePrice: Number(basePrice),
                },
            });
            
            // Create options and values
            if (options && options.length > 0) {
                for (let i = 0; i < options.length; i++) {
                    const opt = options[i];
                    const createdOption = await tx.productOption.create({
                        data: {
                            productId: product.id,
                            name: opt.name,
                            minSelect: Number(opt.minSelect || 1),
                            maxSelect: Number(opt.maxSelect || 1),
                            sortOrder: i,
                        }
                    });
                    
                    if (opt.values && opt.values.length > 0) {
                        for (let j = 0; j < opt.values.length; j++) {
                            const val = opt.values[j];
                            await tx.productOptionValue.create({
                                data: {
                                    optionId: createdOption.id,
                                    name: val.name,
                                    priceModifier: Number(val.priceModifier || 0),
                                    isDefault: !!val.isDefault,
                                    sortOrder: j,
                                }
                            });
                        }
                    }
                }
            }

            // Create modifiers
            if (modifiers && modifiers.length > 0) {
                for (let i = 0; i < modifiers.length; i++) {
                    const mod = modifiers[i];
                    await tx.productModifier.create({
                        data: {
                            productId: product.id,
                            name: mod.name,
                            price: Number(mod.price || 0),
                            isAvailable: mod.isAvailable !== false,
                            sortOrder: i,
                        }
                    });
                }
            }
        });

        try {
            revalidatePath("/products");
        } catch (revalError) {
            console.error("Revalidation failed for /products:", revalError);
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error creating product:", error);
        return { success: false, error: error?.message || String(error) };
    }
}

export async function updateProduct(id: string, data: any) {
    try {
        const { basePrice, options, modifiers, ...rest } = data;
        
        await db.$transaction(async (tx) => {
            // 1. Update basic product
            await tx.product.update({
                where: { id },
                data: {
                    ...rest,
                    basePrice: Number(basePrice),
                },
            });

            // 2. Delete old modifiers
            await tx.productModifier.deleteMany({
                where: { productId: id },
            });

            // 3. Delete old option values and options
            const oldOptions = await tx.productOption.findMany({
                where: { productId: id },
                select: { id: true },
            });
            const oldOptionIds = oldOptions.map(o => o.id);
            
            if (oldOptionIds.length > 0) {
                await tx.productOptionValue.deleteMany({
                    where: { optionId: { in: oldOptionIds } },
                });
                await tx.productOption.deleteMany({
                    where: { id: { in: oldOptionIds } },
                });
            }

            // 4. Create new options and values
            if (options && options.length > 0) {
                for (let i = 0; i < options.length; i++) {
                    const opt = options[i];
                    const createdOption = await tx.productOption.create({
                        data: {
                            productId: id,
                            name: opt.name,
                            minSelect: Number(opt.minSelect || 1),
                            maxSelect: Number(opt.maxSelect || 1),
                            sortOrder: i,
                        }
                    });
                    
                    if (opt.values && opt.values.length > 0) {
                        for (let j = 0; j < opt.values.length; j++) {
                            const val = opt.values[j];
                            await tx.productOptionValue.create({
                                data: {
                                    optionId: createdOption.id,
                                    name: val.name,
                                    priceModifier: Number(val.priceModifier || 0),
                                    isDefault: !!val.isDefault,
                                    sortOrder: j,
                                }
                            });
                        }
                    }
                }
            }

            // 5. Create new modifiers
            if (modifiers && modifiers.length > 0) {
                for (let i = 0; i < modifiers.length; i++) {
                    const mod = modifiers[i];
                    await tx.productModifier.create({
                        data: {
                            productId: id,
                            name: mod.name,
                            price: Number(mod.price || 0),
                            isAvailable: mod.isAvailable !== false,
                            sortOrder: i,
                        }
                    });
                }
            }
        });

        try {
            revalidatePath("/products");
            revalidatePath(`/products/${id}`);
        } catch (revalError) {
            console.error(`Revalidation failed for /products and /products/${id}:`, revalError);
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error updating product:", error);
        return { success: false, error: error?.message || String(error) };
    }
}
