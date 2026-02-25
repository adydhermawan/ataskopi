"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Voucher } from "@prisma/client";
import { VoucherCard } from "./voucher-card";

interface VoucherClientProps {
    data: Voucher[];
}

import { PageHeader } from "@/components/layout/page-header";

export function VoucherClient({ data }: VoucherClientProps) {
    const router = useRouter();

    return (
        <>
            <PageHeader
                title="Vouchers"
                description="Manage discount codes for your customers."
            >
                <Button onClick={() => router.push('/marketing/vouchers/new')}>
                    <Plus className="mr-2 h-4 w-4" /> Add New
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                {data.map((voucher) => (
                    <VoucherCard key={voucher.id} data={voucher} />
                ))}
            </div>
            {data.length === 0 && (
                <div className="text-center p-10 text-muted-foreground">
                    No vouchers found. Create one to get started.
                </div>
            )}
        </>
    );
}
