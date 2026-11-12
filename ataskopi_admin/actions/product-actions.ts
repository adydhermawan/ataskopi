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


            // 3. Diff and update options and values to avoid foreign key errors on ordered items
            const existingOptions = await tx.productOption.findMany({
                where: { productId: id },
                include: { values: true },
            });

            const incomingOptionIds = new Set(options.map((o: any) => o.id).filter(Boolean));
            const incomingValueIds = new Set(
                options.flatMap((o: any) => o.values || []).map((v: any) => v.id).filter(Boolean)
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
            if (options && options.length > 0) {
                for (let i = 0; i < options.length; i++) {
                    const opt = options[i];
                    let optionId = opt.id;

                    if (optionId) {
                        // Update existing option
                        await tx.productOption.update({
                            where: { id: optionId },
                            data: {
                                name: opt.name,
                                minSelect: Number(opt.minSelect || 1),
                                maxSelect: Number(opt.maxSelect || 1),
                                sortOrder: i,
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
                                sortOrder: i,
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
                                        sortOrder: j,
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
                                        sortOrder: j,
                                        isAvailable: true,
                                    }
                                });
                            }
                        }
                    }
                }
            }

            // 5. Diff modifiers. Old orders reference modifier rows, so a modifier that was
            // ever ordered is hidden instead of deleted.
            const existingModifiers = await tx.productModifier.findMany({
                where: { productId: id },
                select: { id: true, _count: { select: { orderItemModifiers: true } } },
            });
            const existingModifierIds = new Set(existingModifiers.map((m) => m.id));
            const incomingModifiers: any[] = modifiers || [];
            const incomingModifierIds = new Set(incomingModifiers.map((m) => m.id).filter(Boolean));

            for (const mod of existingModifiers) {
                if (incomingModifierIds.has(mod.id)) continue;
                if (mod._count.orderItemModifiers > 0) {
                    await tx.productModifier.update({ where: { id: mod.id }, data: { isAvailable: false } });
                } else {
                    await tx.productModifier.delete({ where: { id: mod.id } });
                }
            }

            for (let i = 0; i < incomingModifiers.length; i++) {
                const mod = incomingModifiers[i];
                const modifierData = {
                    name: mod.name,
                    price: Number(mod.price || 0),
                    isAvailable: mod.isAvailable !== false,
                    sortOrder: i,
                };
                if (mod.id && existingModifierIds.has(mod.id)) {
                    await tx.productModifier.update({ where: { id: mod.id }, data: modifierData });
                } else {
                    await tx.productModifier.create({ data: { productId: id, ...modifierData } });
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
