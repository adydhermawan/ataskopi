"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Category } from "@prisma/client";
import { createProduct, updateProduct } from "@/actions/product-actions";
import { Plus, Trash2, X } from "lucide-react";
import ImageUpload from "@/components/ui/image-upload";
import { toast } from "sonner";

const productFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    categoryId: z.string().min(1, "Category is required"),
    basePrice: z.any(),
    imageUrl: z.string().optional(),
    isAvailable: z.any(),
    isRecommended: z.any(),
    options: z.array(
        z.object({
            id: z.string().optional(),
            name: z.string().min(1, "Option name is required"),
            minSelect: z.coerce.number().default(1),
            maxSelect: z.coerce.number().default(1),
            values: z.array(
                z.object({
                    id: z.string().optional(),
                    name: z.string().min(1, "Value name is required"),
                    priceModifier: z.coerce.number().default(0),
                    isDefault: z.boolean().default(false),
                })
            ).min(1, "At least one value is required"),
        })
    ),
    modifiers: z.array(
        z.object({
            name: z.string().min(1, "Modifier name is required"),
            price: z.coerce.number().default(0),
            isAvailable: z.boolean().default(true),
        })
    ),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
    categories: Category[];
    initialData?: any; // Replace with proper Product type
}

export function ProductForm({ categories, initialData }: ProductFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productFormSchema) as any,
        defaultValues: initialData
            ? {
                name: initialData.name,
                description: initialData.description || "",
                categoryId: initialData.categoryId,
                basePrice: Number(initialData.basePrice),
                imageUrl: initialData.imageUrl || "",
                isAvailable: initialData.isAvailable,
                isRecommended: initialData.isRecommended,
                options: initialData.options || [],
                modifiers: initialData.modifiers || [],
            }
            : {
                name: "",
                description: "",
                categoryId: "",
                basePrice: 0,
                imageUrl: "",
                isAvailable: true,
                isRecommended: false,
                options: [],
                modifiers: [],
            },
    });

    const { fields: optionsFields, append: appendOption, remove: removeOption } = useFieldArray({
        control: form.control,
        name: "options",
    });

    const { fields: modifiersFields, append: appendModifier, remove: removeModifier } = useFieldArray({
        control: form.control,
        name: "modifiers",
    });

    async function onSubmit(data: ProductFormValues) {
        setLoading(true);
        try {
            let result;
            if (initialData) {
                result = await updateProduct(initialData.id, data);
            } else {
                result = await createProduct(data);
            }
            
            if (result && !result.success) {
                console.error("Failed to save product:", result.error);
                toast.error(result.error || "Gagal menyimpan produk");
            } else {
                toast.success(initialData ? "Produk berhasil diperbarui" : "Produk berhasil dibuat");
                router.push("/products");
                router.refresh();
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || "Gagal menyimpan produk");
        } finally {
            setLoading(false);
        }
    }

    const onError = (errors: any) => {
        console.error("Form validation errors:", errors);
        toast.error("Gagal menyimpan: Periksa kembali kolom nama, varian, atau modifier yang wajib diisi!");
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
                {/* Basic Product Info */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Product name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="basePrice"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price (Rp)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Product description"
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Gambar Produk</FormLabel>
                            <FormControl>
                                <ImageUpload
                                    value={field.value || ''}
                                    disabled={loading}
                                    onChange={(url) => field.onChange(url)}
                                    onRemove={() => field.onChange("")}
                                />
                            </FormControl>
                            <FormDescription>
                                Unggah foto atau gambar produk kopi/makanan.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex gap-4">
                    <FormField
                        control={form.control}
                        name="isAvailable"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Available</FormLabel>
                                    <FormDescription>
                                        Show this product in the catalog.
                                    </FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="isRecommended"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Recommended</FormLabel>
                                    <FormDescription>
                                        Feature this product on the home screen.
                                    </FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />
                </div>

                {/* Options Section */}
                <div className="space-y-6 rounded-lg border p-6 bg-slate-50/50 dark:bg-slate-900/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Opsi Produk (Varian/Size/Sugar/dll.)</h3>
                            <p className="text-sm text-muted-foreground">Opsi pilihan produk di mana customer bisa memilih salah satu (single select) atau beberapa (multi select).</p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendOption({ name: "", minSelect: 1, maxSelect: 1, values: [{ name: "", priceModifier: 0, isDefault: false }] })}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Tambah Opsi
                        </Button>
                    </div>

                    {optionsFields.length === 0 && (
                        <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground text-sm bg-white dark:bg-slate-900/20">
                            Belum ada opsi produk yang ditambahkan.
                        </div>
                    )}

                    {optionsFields.map((optField, optIndex) => (
                        <div key={optField.id} className="p-5 border rounded-lg bg-white dark:bg-slate-900/40 space-y-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div className="grid gap-4 md:grid-cols-3 flex-1">
                                    <FormField
                                        control={form.control}
                                        name={`options.${optIndex}.name`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold">Nama Opsi (e.g. Pilih Varian)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nama Opsi" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`options.${optIndex}.minSelect`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold">Minimal Pilihan</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`options.${optIndex}.maxSelect`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold">Maksimal Pilihan</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-700 mt-7"
                                    onClick={() => removeOption(optIndex)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Option Values Nested Array */}
                            <div className="pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pilihan Nilai / Varian</h4>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800"
                                        onClick={() => {
                                            const currentValues = form.getValues(`options.${optIndex}.values`) || [];
                                            form.setValue(`options.${optIndex}.values`, [
                                                ...currentValues,
                                                { name: "", priceModifier: 0, isDefault: false }
                                            ]);
                                        }}
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Pilihan Varian
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {form.watch(`options.${optIndex}.values`)?.map((valItem, valIndex) => (
                                        <div key={valIndex} className="flex items-start gap-4">
                                            <div className="flex-1">
                                                <Input
                                                    placeholder="Nama Varian (e.g. Regular, Ice, No Sugar)"
                                                    value={form.watch(`options.${optIndex}.values.${valIndex}.name`) || ""}
                                                    onChange={(e) => {
                                                        form.setValue(`options.${optIndex}.values.${valIndex}.name`, e.target.value);
                                                        form.trigger(`options.${optIndex}.values.${valIndex}.name`);
                                                    }}
                                                    className={(form.formState.errors.options as any)?.[optIndex]?.values?.[valIndex]?.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                                                />
                                                {(form.formState.errors.options as any)?.[optIndex]?.values?.[valIndex]?.name && (
                                                    <p className="text-[11px] text-red-500 mt-1">Nama varian wajib diisi</p>
                                                )}
                                            </div>
                                            <div className="w-40">
                                                <Input
                                                    type="number"
                                                    placeholder="Harga Tambahan (Rp)"
                                                    value={form.watch(`options.${optIndex}.values.${valIndex}.priceModifier`) ?? ""}
                                                    onChange={(e) => {
                                                        form.setValue(`options.${optIndex}.values.${valIndex}.priceModifier`, parseFloat(e.target.value) || 0);
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={form.watch(`options.${optIndex}.values.${valIndex}.isDefault`) || false}
                                                    onCheckedChange={(checked) => {
                                                        form.setValue(`options.${optIndex}.values.${valIndex}.isDefault`, checked === true);
                                                    }}
                                                />
                                                <span className="text-xs text-muted-foreground font-medium">Default</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700 h-9 w-9"
                                                disabled={(form.watch(`options.${optIndex}.values`) || []).length <= 1}
                                                onClick={() => {
                                                    const currentValues = form.getValues(`options.${optIndex}.values`) || [];
                                                    form.setValue(
                                                        `options.${optIndex}.values`,
                                                        currentValues.filter((_, idx) => idx !== valIndex)
                                                    );
                                                }}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Modifiers Section */}
                <div className="space-y-6 rounded-lg border p-6 bg-slate-50/50 dark:bg-slate-900/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Tambahan / Modifiers (Opsional)</h3>
                            <p className="text-sm text-muted-foreground">Daftar item tambahan yang bersifat opsional untuk dibeli (Contoh: Extra Shot, Jelly Aren, dll.).</p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendModifier({ name: "", price: 0, isAvailable: true })}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Tambah Tambahan
                        </Button>
                    </div>

                    {modifiersFields.length === 0 && (
                        <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground text-sm bg-white dark:bg-slate-900/20">
                            Belum ada modifier/tambahan yang ditambahkan.
                        </div>
                    )}

                    <div className="space-y-3">
                        {modifiersFields.map((modField, modIndex) => (
                            <div key={modField.id} className="flex items-center gap-4 p-4 border rounded-lg bg-white dark:bg-slate-900/40 shadow-sm">
                                <div className="flex-1">
                                    <FormField
                                        control={form.control}
                                        name={`modifiers.${modIndex}.name`}
                                        render={({ field }) => (
                                            <FormItem className="space-y-0.5">
                                                <FormControl>
                                                    <Input placeholder="Nama Tambahan (e.g. Extra Shot)" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="w-48">
                                    <FormField
                                        control={form.control}
                                        name={`modifiers.${modIndex}.price`}
                                        render={({ field }) => (
                                            <FormItem className="space-y-0.5">
                                                <FormControl>
                                                    <Input type="number" placeholder="Harga (Rp)" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <FormField
                                        control={form.control}
                                        name={`modifiers.${modIndex}.isAvailable`}
                                        render={({ field }) => (
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="text-xs text-muted-foreground font-medium">Tersedia</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-700 h-9 w-9"
                                    onClick={() => removeModifier(modIndex)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full md:w-auto px-6 py-2">
                    {loading ? "Saving..." : initialData ? "Save Changes" : "Create Product"}
                </Button>
            </form>
        </Form>
    );
}
