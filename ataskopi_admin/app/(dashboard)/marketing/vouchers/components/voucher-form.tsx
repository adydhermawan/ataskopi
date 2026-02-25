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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createVoucher, updateVoucher } from "@/actions/vouchers";
import { toast } from "sonner";
import { Voucher } from "@prisma/client";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";

const formSchema = z.object({
    code: z.any(),
    description: z.any(),
    discountType: z.any(),
    discountValue: z.any(),
    maxDiscount: z.any(),
    minOrder: z.any(),
    startDate: z.any(),
    endDate: z.any(),
    usageLimit: z.any(),
    // Advanced
    userUsageLimit: z.any(),
    validOrderTypes: z.any(),
    customerEligibility: z.any()
});

interface VoucherFormProps {
    initialData?: Voucher | null;
    onSuccess?: () => void;
}

export function VoucherForm({ initialData, onSuccess }: VoucherFormProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: initialData?.code || "",
            description: initialData?.description || "",
            discountType: (initialData?.discountType as "FIXED" | "PERCENT") || "FIXED",
            discountValue: initialData ? Number(initialData.discountValue) : 0,
            maxDiscount: initialData?.maxDiscount ? Number(initialData.maxDiscount) : undefined,
            minOrder: initialData?.minOrder ? Number(initialData.minOrder) : undefined,
            startDate: initialData?.startDate ? new Date(initialData.startDate) : undefined,
            endDate: initialData?.endDate ? new Date(initialData.endDate) : undefined,
            usageLimit: initialData?.usageLimit ?? undefined,
            userUsageLimit: initialData?.userUsageLimit ?? undefined,
            validOrderTypes: (initialData?.validOrderTypes as string[]) || ["DINE_IN", "PICKUP", "DELIVERY"],
            customerEligibility: initialData?.customerEligibility || "ALL"
        }
    });

    // Helper for date conversion if needed, but date-picker usually handles Date objects

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            const apiData = {
                ...values,
                maxDiscount: values.maxDiscount || undefined,
                minOrder: values.minOrder || undefined,
                startDate: values.startDate || undefined,
                endDate: values.endDate || undefined,
                usageLimit: values.usageLimit || undefined,
                userUsageLimit: values.userUsageLimit || undefined,
            }

            let result;
            if (initialData) {
                // For update, exclude code from editable fields if we want, but schema allows it
                // Actually Prisma update needs partial
                result = await updateVoucher(initialData.id, apiData);
            } else {
                result = await createVoucher(apiData);
            }

            if (result.success) {
                toast.success(initialData ? "Voucher updated" : "Voucher created");
                if (onSuccess) {
                    onSuccess();
                } else {
                    // Refresh data first to ensure list is up to date, then navigate
                    router.refresh();
                    router.push('/marketing/vouchers');
                }
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    const discountType = form.watch("discountType");

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Voucher Code</FormLabel>
                            <FormControl>
                                <Input placeholder="SUMMER2024" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                            </FormControl>
                            <FormDescription>Unique code for redemption (uppercase).</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Input placeholder="Summer Sale Discount" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="discountType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="FIXED">Fixed Amount (Rp)</SelectItem>
                                        <SelectItem value="PERCENT">Percentage (%)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="discountValue"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Value</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {discountType === 'PERCENT' && (
                    <FormField
                        control={form.control}
                        name="maxDiscount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Max Discount Amount (Rp)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Optional limit" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <FormField
                    control={form.control}
                    name="minOrder"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Min. Order Amount (Rp)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    {/* Note: Assuming generic HTML date input for speed, or replace with DatePicker */}
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Start Date</FormLabel>
                                <FormControl>
                                    <Input
                                        type="date"
                                        value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>End Date</FormLabel>
                                <FormControl>
                                    <Input
                                        type="date"
                                        value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="usageLimit"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Total Usage Limit</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="Unlimited" {...field} />
                            </FormControl>
                            <FormDescription>Global limit (e.g., first 100 people).</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="border-t pt-4 mt-4">
                    <h3 className="mb-4 text-lg font-medium">Advanced Validation</h3>

                    <div className="grid gap-4">
                        <FormField
                            control={form.control}
                            name="userUsageLimit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Limit Per User</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="1" {...field} />
                                    </FormControl>
                                    <FormDescription>How many times a single user can use this.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="customerEligibility"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Customer Eligibility</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Who can use this?" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Customers</SelectItem>
                                            <SelectItem value="NEW_USER">New Customers Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="validOrderTypes"
                            render={() => (
                                <FormItem>
                                    <div className="mb-4">
                                        <FormLabel className="text-base">Order Types</FormLabel>
                                        <FormDescription>
                                            Restrict to specific order modes.
                                        </FormDescription>
                                    </div>
                                    <div className="flex gap-4">
                                        {["DINE_IN", "PICKUP", "DELIVERY"].map((type) => (
                                            <FormField
                                                key={type}
                                                control={form.control}
                                                name="validOrderTypes"
                                                render={({ field }) => {
                                                    return (
                                                        <FormItem
                                                            key={type}
                                                            className="flex flex-row items-start space-x-3 space-y-0"
                                                        >
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(type)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                            ? field.onChange([...(field.value || []), type])
                                                                            : field.onChange(
                                                                                (field.value as any[])?.filter(
                                                                                    (value: any) => value !== type
                                                                                )
                                                                            )
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">
                                                                {type}
                                                            </FormLabel>
                                                        </FormItem>
                                                    )
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Button disabled={loading} className="w-full" type="submit">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Save Changes" : "Create Voucher"}
                </Button>
            </form>
        </Form>
    );
}
