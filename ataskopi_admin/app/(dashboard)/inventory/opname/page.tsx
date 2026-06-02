import { PageHeader } from "@/components/layout/page-header"
import { StockOpnameClient } from "@/components/inventory/stock-opname-client"

export const dynamic = 'force-dynamic'

export default function StockOpnamePage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Stock Opname" />
            <StockOpnameClient />
        </div>
    )
}
