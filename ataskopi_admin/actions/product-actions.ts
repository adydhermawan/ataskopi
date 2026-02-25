"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createProduct(data: any) {
    const { basePrice, ...rest } = data;
    await db.product.create({
        data: {
            ...rest,
            basePrice: Number(basePrice),
        },
    });
    revalidatePath("/products");
}

export async function updateProduct(id: string, data: any) {
    const { basePrice, ...rest } = data;
    await db.product.update({
        where: { id },
        data: {
            ...rest,
            basePrice: Number(basePrice),
        },
    });
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
}
