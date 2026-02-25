import { db } from "@/lib/db";
import { ProductForm } from "../components/product-form";

export default async function NewProductPage() {
    const categories = await db.category.findMany();

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">New Product</h1>
                <p className="text-muted-foreground">
                    Create a new product for your catalog.
                </p>
            </div>
            <div className="rounded-md border bg-white p-6">
                <ProductForm categories={categories} />
            </div>
        </div>
    );
}
