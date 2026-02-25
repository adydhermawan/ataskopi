import { getVouchers } from "@/actions/vouchers";
import { VoucherClient } from "./components/voucher-client";

export const dynamic = 'force-dynamic'

export default async function VouchersPage() {
    const vouchers = await getVouchers();
    const formattedVouchers = vouchers.map((item) => ({
        ...item,
        discountValue: Number(item.discountValue),
        maxDiscount: item.maxDiscount ? Number(item.maxDiscount) : null,
        minOrder: item.minOrder ? Number(item.minOrder) : null,
    }));

    return (
        <div className="flex-1 space-y-4">
            <VoucherClient data={formattedVouchers as any} />
        </div>
    );
}
