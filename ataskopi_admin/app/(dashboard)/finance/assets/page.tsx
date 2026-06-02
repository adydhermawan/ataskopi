import { PageHeader } from "@/components/layout/page-header"
import { AssetsClient } from "@/components/finance/assets-client"

export const dynamic = 'force-dynamic'

export default function AssetsPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Aset & Balik Modal (ROI)" />
            <AssetsClient />
        </div>
    )
}
