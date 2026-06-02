import { PageHeader } from "@/components/layout/page-header"
import { MaterialsClient } from "@/components/inventory/materials-client"

export const dynamic = 'force-dynamic'

export default function MaterialsPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Bahan Baku (Raw Materials)" />
            <MaterialsClient />
        </div>
    )
}
