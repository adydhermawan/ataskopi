"use client";

import { useState } from "react";
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
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateOrderModeSettings } from "@/actions/settings";
import { toast } from "sonner";
import { OrderModeSetting } from "@prisma/client";
import { Loader2, Utensils, ShoppingBag, Truck } from "lucide-react";

// Schema
const formSchema = z.object({
    dineIn: z.boolean(),
    pickup: z.boolean(),
    delivery: z.boolean(),
    dineInMethod: z.string(),
});

interface OrderModeSettingsFormProps {
    initialData: OrderModeSetting | null;
}

export function OrderModeSettingsForm({ initialData }: OrderModeSettingsFormProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            dineIn: initialData?.dineIn ?? true,
            pickup: initialData?.pickup ?? true,
            delivery: initialData?.delivery ?? true,
            dineInMethod: initialData?.dineInMethod ?? 'SCAN_ONLY',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            const result = await updateOrderModeSettings(values);
            if (result.success) {
                toast.success("Order mode settings updated successfully");
            } else {
                toast.error(result.error || "Failed to update settings");
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Dine In */}
                    <Card className="flex flex-col justify-between">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg">
                                    <Utensils className="w-5 h-5" />
                                </span>
                                <CardTitle className="text-lg">Dine In</CardTitle>
                            </div>
                            <CardDescription>
                                Allow customers to order and eat directly at tables by scanning a QR Code.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0">
                            <FormField
                                control={form.control}
                                name="dineIn"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 w-full bg-slate-50/50 dark:bg-slate-900/20">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-sm font-medium">Status Layanan</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {form.watch('dineIn') && (
                                <FormField
                                    control={form.control}
                                    name="dineInMethod"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="text-sm font-medium">Metode Identifikasi Meja</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Pilih metode" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="SCAN_ONLY">Hanya Scan QR Meja</SelectItem>
                                                    <SelectItem value="GUEST_NAME_ONLY">Hanya Nama Pelanggan</SelectItem>
                                                    <SelectItem value="BOTH">Scan QR atau Tulis Nama</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Pick Up */}
                    <Card className="flex flex-col justify-between">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-2 rounded-lg">
                                    <ShoppingBag className="w-5 h-5" />
                                </span>
                                <CardTitle className="text-lg">Pick Up</CardTitle>
                            </div>
                            <CardDescription>
                                Allow customers to pre-order online and pick up their food at the shop.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between pt-0">
                            <FormField
                                control={form.control}
                                name="pickup"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 w-full bg-slate-50/50 dark:bg-slate-900/20">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-sm font-medium">Status Layanan</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Delivery */}
                    <Card className="flex flex-col justify-between">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 p-2 rounded-lg">
                                    <Truck className="w-5 h-5" />
                                </span>
                                <CardTitle className="text-lg">Delivery</CardTitle>
                            </div>
                            <CardDescription>
                                Allow customers to order online and get food delivered to their address.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between pt-0">
                            <FormField
                                control={form.control}
                                name="delivery"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 w-full bg-slate-50/50 dark:bg-slate-900/20">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-sm font-medium">Status Layanan</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end">
                    <Button disabled={loading} type="submit" className="w-full md:w-auto px-6 py-2">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Simpan Pengaturan
                    </Button>
                </div>
            </form>
        </Form>
    );
}
