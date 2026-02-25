"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Promo } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { PromoForm } from "./promo-form";

interface PromoClientProps {
    data: Promo[];
}

import { PageHeader } from "@/components/layout/page-header";

export function PromoClient({ data }: PromoClientProps) {
    const [open, setOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState<Promo | null>(null);

    const handleEdit = (promo: Promo) => {
        setEditingPromo(promo);
        setOpen(true);
    };

    const handleAddNew = () => {
        setEditingPromo(null);
        setOpen(true);
    };

    return (
        <>
            <PageHeader
                title="Promos & Banners"
                description="Manage app banners and announcements."
            >
                <Button onClick={handleAddNew}>
                    <Plus className="mr-2 h-4 w-4" /> Add New
                </Button>
            </PageHeader>

            <DataTable
                searchKey="title"
                columns={columns(handleEdit)}
                data={data}
            />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingPromo ? "Edit Promo" : "Create Promo"}</DialogTitle>
                        <DialogDescription>
                            Upload a banner image (recommended ratio 16:9).
                        </DialogDescription>
                    </DialogHeader>
                    <PromoForm
                        initialData={editingPromo}
                        onSuccess={() => setOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
