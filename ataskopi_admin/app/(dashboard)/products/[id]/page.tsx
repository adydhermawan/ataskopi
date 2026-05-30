import { db } from "@/lib/db";
import { ProductForm } from "../components/product-form";
import { notFound } from "next/navigation";

export default async function EditProductPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const product = await db.product.findUnique({
        where: { id: params.id },
        include: {
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
        }
    });

    if (!product) {
        notFound();
    }

    // Convert Decimal and non-serializable fields to plain types for Client Component
    const serializedProduct = {
        id: product.id,
        name: product.name,
        description: product.description || "",
        categoryId: product.categoryId,
        basePrice: Number(product.basePrice),
        imageUrl: product.imageUrl || "",
        isAvailable: product.isAvailable,
        isRecommended: product.isRecommended,
        options: product.options.map(opt => ({
            id: opt.id,
            name: opt.name,
            minSelect: opt.minSelect,
            maxSelect: opt.maxSelect,
            values: opt.values.map(val => ({
                id: val.id,
                name: val.name,
                priceModifier: Number(val.priceModifier),
                isDefault: val.isDefault,
            }))
        })),
        modifiers: product.modifiers.map(mod => ({
            id: mod.id,
            name: mod.name,
            price: Number(mod.price),
            isAvailable: mod.isAvailable,
        }))
    };

    const categories = await db.category.findMany();

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
                <p className="text-muted-foreground">
                    Update product details.
                </p>
            </div>
            <div className="rounded-md border bg-white p-6">
                <ProductForm categories={categories} initialData={serializedProduct} />
            </div>
        </div>
    );
}
