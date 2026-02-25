"use client";

import { useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createOutlet, updateOutlet } from "@/actions/outlets";
import { toast } from "sonner";

const outletFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    phone: z.string().optional(),
    operatingHours: z.string().optional(),
    latitude: z.any(),
    longitude: z.any(),
    isActive: z.any(),
});

type OutletFormValues = z.infer<typeof outletFormSchema>;

interface OutletFormProps {
    initialData?: any;
}

export function OutletForm({ initialData }: OutletFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<OutletFormValues>({
        resolver: zodResolver(outletFormSchema),
        defaultValues: initialData
            ? {
                name: initialData.name,
                address: initialData.address || "",
                phone: initialData.phone || "",
                operatingHours: typeof initialData.operatingHours === 'string'
                    ? initialData.operatingHours
                    : initialData.operatingHours?.text || "",
                latitude: initialData.latitude ? Number(initialData.latitude) : undefined,
                longitude: initialData.longitude ? Number(initialData.longitude) : undefined,
                isActive: initialData.isActive,
            }
            : {
                name: "",
                address: "",
                phone: "",
                operatingHours: "",
                latitude: undefined,
                longitude: undefined,
                isActive: true,
            },
    });

    async function onSubmit(data: OutletFormValues) {
        setLoading(true);
        try {
            if (initialData) {
                const res = await updateOutlet(initialData.id, data);
                if (res.success) {
                    toast.success("Outlet updated");
                } else {
                    toast.error(res.error || "Failed to update outlet");
                }
            } else {
                const res = await createOutlet(data);
                if (res.success) {
                    toast.success("Outlet created");
                } else {
                    toast.error(res.error || "Failed to create outlet");
                }
            }
            router.push("/outlets");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
                <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Outlet name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                    <Input placeholder="Outlet phone" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                                <Input placeholder="Full address" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="operatingHours"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Operating Hours</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. 08:00 - 22:00" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="latitude"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Latitude</FormLabel>
                                <FormControl>
                                    <Input type="number" step="any" placeholder="-6.12345" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="longitude"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Longitude</FormLabel>
                                <FormControl>
                                    <Input type="number" step="any" placeholder="106.12345" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>Active</FormLabel>
                                <FormDescription>
                                    Show this outlet in the customer app.
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />

                <div className="flex items-center gap-x-2">
                    <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : initialData ? "Save Changes" : "Create Outlet"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => router.push("/outlets")}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </Form>
    );
}
