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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateLoyaltySettings } from "@/actions/loyalty";
import { toast } from "sonner";
import { LoyaltySetting } from "@prisma/client";
import { Loader2, Coins, ArrowRightLeft, Gift } from "lucide-react";

// Schema
const formSchema = z.object({
    isEnabled: z.boolean(),
    pointsPerItem: z.any(),
    pointValueIdr: z.any(),
    minPointsToRedeem: z.any(),
    maxPointsPerTransaction: z.any(),
    maxRedemptionPercentage: z.any(),
});

interface LoyaltySettingsFormProps {
    initialData: (Omit<LoyaltySetting, 'pointValueIdr'> & { pointValueIdr: number }) | null;
}

export function LoyaltySettingsForm({ initialData }: LoyaltySettingsFormProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            isEnabled: initialData?.isEnabled ?? true,
            pointsPerItem: initialData?.pointsPerItem ?? 1,
            pointValueIdr: initialData ? initialData.pointValueIdr : 1000,
            minPointsToRedeem: initialData?.minPointsToRedeem ?? 10,
            maxPointsPerTransaction: initialData?.maxPointsPerTransaction ?? undefined,
            maxRedemptionPercentage: initialData?.maxRedemptionPercentage ?? 50,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            const result = await updateLoyaltySettings(values);
            if (result.success) {
                toast.success("Loyalty settings updated successfully");
            } else {
                toast.error(result.error || "Something went wrong");
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
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Switch
                                checked={form.watch('isEnabled')}
                                onCheckedChange={(val) => form.setValue('isEnabled', val)}
                            />
                            Loyalty Program Active
                        </CardTitle>
                        <CardDescription>
                            Enable or disable the entire loyalty point system for customers.
                        </CardDescription>
                    </CardHeader>
                </Card>

                <div className={`grid gap-6 md:grid-cols-2 ${!form.watch('isEnabled') ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-primary/10 text-primary p-2 rounded-lg">
                                    <Coins className="w-5 h-5" />
                                </span>
                                <CardTitle className="text-lg">Earning Rules</CardTitle>
                            </div>
                            <CardDescription>How customers earn points per transaction.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="pointsPerItem"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Points Per Item</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            How many points earned for buying 1 item.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-primary/10 text-primary p-2 rounded-lg">
                                    <ArrowRightLeft className="w-5 h-5" />
                                </span>
                                <CardTitle className="text-lg">Redemption Value</CardTitle>
                            </div>
                            <CardDescription>How much is 1 point worth in IDR.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="pointValueIdr"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Point Value (IDR)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-xs">Rp</span>
                                                <Input type="number" className="pl-9" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            The discount value of 1 point (e.g., 1000 = Rp 1.000).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-primary/10 text-primary p-2 rounded-lg">
                                    <Gift className="w-5 h-5" />
                                </span>
                                <CardTitle className="text-lg">Redemption Limits</CardTitle>
                            </div>
                            <CardDescription>Control how points are used to prevent abuse.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-3 gap-6">
                            <FormField
                                control={form.control}
                                name="minPointsToRedeem"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Min Points to Redeem</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Minimum balance required to start using points.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="maxRedemptionPercentage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Max Redemption %</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type="number" className="pr-8" {...field} />
                                                <span className="absolute right-3 top-2.5 text-slate-500 font-bold">%</span>
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            Max % of total bill payable with points.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="maxPointsPerTransaction"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Max Points / Transaction (Optional)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Cap the points used in a single order.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>

                <Button disabled={loading} className="w-full md:w-auto" type="submit">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </form>
        </Form>
    );
}
