import { PageHeader } from "@/components/layout/page-header"
import { InventoryPurchasesClient } from "@/components/inventory/inventory-purchases-client"

export const dynamic = 'force-dynamic'

export default function InventoryPurchasesPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Pembelian Bahan Baku" />
            <InventoryPurchasesClient />
        </div>
    )
}
