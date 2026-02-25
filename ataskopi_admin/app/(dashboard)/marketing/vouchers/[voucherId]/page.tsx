
import { db as prisma } from "@/lib/db";
import { VoucherForm } from "../components/voucher-form";
import { requirePermission } from "@/lib/auth-utils";
import { notFound } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

export default async function VoucherPage({ params }: { params: Promise<{ voucherId: string }> }) {
    await requirePermission('marketing', 'update');

    // Resolve params using await since it's a Promise in newer Next.js versions often
    const { voucherId } = await params;

    const voucher = await prisma.voucher.findUnique({
        where: { id: voucherId }
    });

    if (!voucher) {
        notFound();
    }

    // Fix: Serialize Decimal to string/number for Client Component
    const serializedVoucher = JSON.parse(JSON.stringify(voucher));

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/marketing/vouchers">Vouchers</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Edit Voucher</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="flex items-center justify-between">
                    <Heading title={`Edit Voucher (${voucher.code})`} description="Update voucher details and validation rules." />
                </div>
                <Separator />
                <VoucherForm initialData={serializedVoucher} />
            </div>
        </div>
    );
}
