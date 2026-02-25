import { db as prisma } from "@/lib/db";
import { CategoryForm } from "../components/category-form";
import { notFound } from "next/navigation";

export default async function EditCategoryPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const category = await prisma.category.findUnique({
        where: {
            id: params.id,
        },
    });

    if (!category) {
        notFound();
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Edit Category</h2>
                    <p className="text-sm text-muted-foreground">Manage category details</p>
                </div>
            </div>
            <CategoryForm initialData={category} />
        </div>
    );
}
