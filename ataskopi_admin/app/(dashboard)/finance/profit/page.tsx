import { PageHeader } from "@/components/layout/page-header"
import { ProfitDashboardClient } from "@/components/finance/profit-dashboard-client"

export const dynamic = 'force-dynamic'

export default function ProfitPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Laporan Net Profit" />
            <ProfitDashboardClient />
        </div>
    )
}
