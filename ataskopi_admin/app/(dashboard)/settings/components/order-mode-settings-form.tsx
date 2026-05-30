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
    FormMessage,
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
import { Loader2, Utensils, ShoppingBag, Truck, Percent, CreditCard, QrCode } from "lucide-react";
import ImageUpload from "@/components/ui/image-upload";

// Schema
const formSchema = z.object({
    dineIn: z.boolean(),
    pickup: z.boolean(),
    delivery: z.boolean(),
    dineInMethod: z.string(),
    taxEnabled: z.boolean(),
    qrisEnabled: z.boolean(),
    cashEnabled: z.boolean(),
    defaultPaymentMethod: z.string(),
    qrisQrCodeUrl: z.string().nullable().optional(),
}).refine((data) => data.qrisEnabled || data.cashEnabled, {
    message: "Minimal salah satu metode pembayaran harus aktif",
    path: ["qrisEnabled"],
});

interface OrderModeSettingsFormProps {
    initialData: any | null; // using any to bypass temporary type mismatch before local ts compilation of generated prisma client
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
            taxEnabled: initialData?.taxEnabled ?? true,
            qrisEnabled: initialData?.qrisEnabled ?? true,
            cashEnabled: initialData?.cashEnabled ?? true,
            defaultPaymentMethod: initialData?.defaultPaymentMethod ?? 'qris',
            qrisQrCodeUrl: initialData?.qrisQrCodeUrl ?? '',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            const result = await updateOrderModeSettings({
                ...values,
                qrisQrCodeUrl: values.qrisQrCodeUrl || null,
            });
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
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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

                    {/* Pajak (Tax) */}
                    <Card className="flex flex-col justify-between">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
                                    <Percent className="w-5 h-5" />
                                </span>
                                <CardTitle className="text-lg">Pajak (PPN 11%)</CardTitle>
                            </div>
                            <CardDescription>
                                Aktifkan atau nonaktifkan biaya pajak PPN sebesar 11% untuk setiap transaksi pesanan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between pt-0">
                            <FormField
                                control={form.control}
                                name="taxEnabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 w-full bg-slate-50/50 dark:bg-slate-900/20">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-sm font-medium">Aktifkan Pajak</FormLabel>
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

                {/* Pengaturan Pembayaran */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg">
                                <CreditCard className="w-5 h-5" />
                            </span>
                            <CardTitle className="text-lg">Pengaturan Pembayaran</CardTitle>
                        </div>
                        <CardDescription>
                            Atur ketersediaan metode pembayaran dan maintain gambar QRIS code.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Kiri: Toggles & Default */}
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="qrisEnabled"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 w-full bg-slate-50/50 dark:bg-slate-900/20">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm font-medium">Metode QRIS</FormLabel>
                                                <FormDescription>Menggunakan transfer digital (e-wallet/bank).</FormDescription>
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

                                <FormField
                                    control={form.control}
                                    name="cashEnabled"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 w-full bg-slate-50/50 dark:bg-slate-900/20">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm font-medium">Metode Tunai (Cash)</FormLabel>
                                                <FormDescription>Khusus untuk dine-in, bayar langsung di kasir.</FormDescription>
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

                                <FormField
                                    control={form.control}
                                    name="defaultPaymentMethod"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="text-sm font-medium">Default Payment Method</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Pilih metode default" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="qris">QRIS</SelectItem>
                                                    <SelectItem value="cash">Tunai (Cash)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Kanan: Upload QRIS */}
                            {form.watch('qrisEnabled') && (
                                <div className="space-y-4 border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <QrCode className="w-5 h-5 text-muted-foreground" />
                                        <span className="text-sm font-medium">Gambar QRIS Code</span>
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="qrisQrCodeUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <ImageUpload
                                                        value={field.value || ''}
                                                        disabled={loading}
                                                        onChange={(url) => field.onChange(url)}
                                                        onRemove={() => field.onChange("")}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Unggah gambar QRIS statis untuk checkout pelanggan.
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

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
