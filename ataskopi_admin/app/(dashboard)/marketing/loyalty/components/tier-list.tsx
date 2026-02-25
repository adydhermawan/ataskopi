"use client";

import { MembershipTier } from "@prisma/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash, Plus, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { deleteTier } from "@/actions/tiers";
import { toast } from "sonner";
import { AlertModal } from "@/components/modals/alert-modal";
import { TierModal } from "./tier-modal";

interface TierListProps {
    tiers: MembershipTier[];
}

export function TierList({ tiers }: TierListProps) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [selectedTier, setSelectedTier] = useState<MembershipTier | null>(null);
    const [tierModalOpen, setTierModalOpen] = useState(false);

    const onDelete = async () => {
        if (!selectedTier) return;
        try {
            setLoading(true);
            const result = await deleteTier(selectedTier.id);
            if (result.success) {
                toast.success("Tier deleted successfully");
            } else {
                toast.error(result.error || "Failed to delete tier");
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
            setOpen(false);
            setSelectedTier(null);
        }
    };

    return (
        <>
            <AlertModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={onDelete}
                loading={loading}
            />
            <TierModal
                isOpen={tierModalOpen}
                onClose={() => {
                    setTierModalOpen(false);
                    setSelectedTier(null);
                }}
                initialData={selectedTier}
            />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-primary" />
                            Membership Tiers
                        </CardTitle>
                        <CardDescription>
                            Define customer levels based on points earned.
                        </CardDescription>
                    </div>
                    <Button onClick={() => setTierModalOpen(true)} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Tier
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Level</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Min. Points</TableHead>
                                <TableHead>Max. Points</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tiers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                        No tiers defined yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tiers.map((tier) => (
                                    <TableRow key={tier.id}>
                                        <TableCell className="font-medium">
                                            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                                                Lvl {tier.tierLevel}
                                            </span>
                                        </TableCell>
                                        <TableCell>{tier.tierName}</TableCell>
                                        <TableCell>{tier.minPoints.toLocaleString()}</TableCell>
                                        <TableCell>{tier.maxPoints ? tier.maxPoints.toLocaleString() : "∞"}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setSelectedTier(tier);
                                                        setTierModalOpen(true);
                                                    }}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => {
                                                        setSelectedTier(tier);
                                                        setOpen(true);
                                                    }}
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
