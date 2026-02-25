import { CategoryForm } from "../components/category-form";

export default function NewCategoryPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">New Category</h2>
                    <p className="text-sm text-muted-foreground">Add a new product category</p>
                </div>
            </div>
            <CategoryForm />
        </div>
    );
}
