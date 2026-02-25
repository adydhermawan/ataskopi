"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCategory, updateCategory } from "@/actions/categories";
import { toast } from "sonner";

const categoryFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    slug: z.string().min(2, "Slug must be at least 2 characters")
        .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
    sortOrder: z.any(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
    initialData?: any;
}

export function CategoryForm({ initialData }: CategoryFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categoryFormSchema),
        defaultValues: initialData
            ? {
                name: initialData.name,
                slug: initialData.slug,
                sortOrder: initialData.sortOrder || 0,
            }
            : {
                name: "",
                slug: "",
                sortOrder: 0,
            },
    });

    async function onSubmit(data: CategoryFormValues) {
        setLoading(true);
        try {
            if (initialData) {
                const res = await updateCategory(initialData.id, data);
                if (res.success) {
                    toast.success("Category updated");
                } else {
                    toast.error(res.error || "Failed to update category");
                }
            } else {
                const res = await createCategory(data);
                if (res.success) {
                    toast.success("Category created");
                } else {
                    toast.error(res.error || "Failed to create category");
                }
            }
            router.push("/categories");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    // Auto-generate slug from name if creating new
    const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        form.setValue("name", name);
        if (!initialData) {
            const slug = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)+/g, "");
            form.setValue("slug", slug, { shouldValidate: true });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-xl">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Category name (e.g., Coffee, Pastry)"
                                    {...field}
                                    onChange={onNameChange}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Slug</FormLabel>
                            <FormControl>
                                <Input placeholder="category-slug" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="sortOrder"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sort Order</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex items-center gap-x-2">
                    <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : initialData ? "Save Changes" : "Create Category"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => router.push("/categories")}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </Form>
    );
}
