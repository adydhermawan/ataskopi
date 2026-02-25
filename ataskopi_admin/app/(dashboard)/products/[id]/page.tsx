import { db } from "@/lib/db";
import { ProductForm } from "../components/product-form";
import { notFound } from "next/navigation";

export default async function EditProductPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const product = await db.product.findUnique({
        where: { id: params.id },
    });

    if (!product) {
        notFound();
    }

    // Convert Decimal to plain number for serialization to Client Component
    const serializedProduct = {
        ...product,
        basePrice: Number(product.basePrice),
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
