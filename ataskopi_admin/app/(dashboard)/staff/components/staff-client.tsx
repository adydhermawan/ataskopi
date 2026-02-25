"use client";

import { Outlet, User } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { columns, StaffColumn } from "./columns";
import { PageHeader } from "@/components/layout/page-header";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaffModal } from "./staff-modal";
import { useState } from "react";

interface StaffClientProps {
    staff: (User & { outlet: Outlet | null })[];
    outlets: Outlet[];
}

export function StaffClient({ staff, outlets }: StaffClientProps) {
    const [open, setOpen] = useState(false);

    const formattedStaff: StaffColumn[] = staff.map((item) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        email: item.email,
        role: item.role,
        outletId: item.outletId,
        outletName: item.outlet?.name || "Global / Unassigned",
        createdAt: format(item.createdAt, "MMMM do, yyyy"),
    }));

    // We can't easily pass 'outlets' to the static columns definition
    // unless we define columns INSIDE the component or use a decorator.
    // Let's pass it via a custom prop if DataTable supports it, 
    // or better, define the column helper here.

    return (
        <div className="flex-1 space-y-4">
            <StaffModal
                isOpen={open}
                onClose={() => setOpen(false)}
                outlets={outlets}
            />
            <PageHeader
                title={`Staff & Admins (${staff.length})`}
                description="Manage your team members and their access levels."
            >
                <Button onClick={() => setOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New
                </Button>
            </PageHeader>
            <DataTable
                searchKey="name"
                columns={columns(outlets)}
                data={formattedStaff}
            />
        </div>
    );
}
