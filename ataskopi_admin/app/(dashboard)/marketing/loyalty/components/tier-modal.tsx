"use client";

import { Modal } from "@/components/ui/modal";
import { MembershipTier } from "@prisma/client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createTier, updateTier } from "@/actions/tiers";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
    tierLevel: z.any(),
    tierName: z.string().min(2),
    minPoints: z.any(),
    maxPoints: z.any(),
    benefitsDescription: z.string().optional(),
});

interface TierModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: MembershipTier | null;
}

export function TierModal({ isOpen, onClose, initialData }: TierModalProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            tierLevel: initialData.tierLevel,
            tierName: initialData.tierName,
            minPoints: initialData.minPoints,
            maxPoints: initialData.maxPoints,
            benefitsDescription: initialData.benefitsDescription || "",
        } : {
            tierLevel: 1,
            tierName: "",
            minPoints: 0,
            maxPoints: undefined,
            benefitsDescription: "",
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                tierLevel: initialData.tierLevel,
                tierName: initialData.tierName,
                minPoints: initialData.minPoints,
                maxPoints: initialData.maxPoints,
                benefitsDescription: initialData.benefitsDescription || "",
            });
        } else {
            form.reset({
                tierLevel: 1,
                tierName: "",
                minPoints: 0,
                maxPoints: undefined,
                benefitsDescription: "",
            });
        }
    }, [initialData, form, isOpen]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setLoading(true);
            let result;
            if (initialData) {
                result = await updateTier(initialData.id, values);
            } else {
                result = await createTier(values);
            }

            if (result.success) {
                toast.success(initialData ? "Tier updated" : "Tier created");
                onClose();
            } else {
                toast.error(result.error || "Something went wrong");
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={initialData ? "Edit Tier" : "Create Tier"}
            description={initialData ? "Update tier details." : "Add a new customer level."}
            isOpen={isOpen}
            onClose={onClose}
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="tierLevel"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Level</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tierName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Silver, Gold..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="minPoints"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Min. Points</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="maxPoints"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Max. Points (Optional)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="benefitsDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Benefits</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Free shipping, 5% discount..."
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    List the perks for this tier.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="pt-6 space-x-2 flex items-center justify-end w-full">
                        <Button disabled={loading} variant="outline" onClick={onClose} type="button">
                            Cancel
                        </Button>
                        <Button disabled={loading} type="submit">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData ? "Save Changes" : "Create"}
                        </Button>
                    </div>
                </form>
            </Form>
        </Modal>
    );
}
