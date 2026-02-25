
"use client";

import { Voucher } from "@prisma/client";
import { format } from "date-fns";
import { Edit, Trash, Ticket, Users, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { AlertModal } from "@/components/modals/alert-modal"; // Assuming you have this
import { useState } from "react";
import { deleteVoucher } from "@/actions/vouchers"; // You'll need valid delete action
import { toast } from "sonner";

interface VoucherCardProps {
    data: Voucher;
}

export const VoucherCard: React.FC<VoucherCardProps> = ({
    data
}) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const onConfirm = async () => {
        try {
            setLoading(true);
            await deleteVoucher(data.id);
            toast.success("Voucher deleted.");
            router.refresh();
        } catch (error) {
            toast.error("Make sure you removed all categories using this voucher first.");
        } finally {
            setLoading(false);
            setOpen(false);
        }
    };

    const isExpired = data.endDate && new Date(data.endDate) < new Date();
    const usagePercent = data.usageLimit ? Math.round((data.usedCount / data.usageLimit) * 100) : 0;

    return (
        <>
            <AlertModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={onConfirm}
                loading={loading}
            />
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xl font-bold font-mono">
                        {data.code}
                    </CardTitle>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/marketing/vouchers/${data.id}`)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setOpen(true)} className="text-destructive">
                                <Trash className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold mb-2">
                        {data.discountType === "PERCENT" ? `${data.discountValue}% OFF` : `Rp ${Number(data.discountValue).toLocaleString()}`}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[2.5em]">
                        {data.description || "No description provided."}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center text-muted-foreground">
                            <Users className="mr-2 h-3 w-3" />
                            {data.usageLimit ? `${data.usedCount} / ${data.usageLimit}` : `${data.usedCount} used`}
                        </div>
                        <div className="flex items-center text-muted-foreground">
                            <Calendar className="mr-2 h-3 w-3" />
                            {data.endDate ? format(data.endDate, "dd MMM yyyy") : "No Expiry"}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Badge variant={!data.isActive ? "secondary" : isExpired ? "destructive" : "default"}>
                        {!data.isActive ? "Inactive" : isExpired ? "Expired" : "Active"}
                    </Badge>
                    {data.minOrder && (
                        <div className="text-xs text-muted-foreground">
                            Min. {Number(data.minOrder).toLocaleString()}
                        </div>
                    )}
                </CardFooter>
            </Card>
        </>
    );
};
