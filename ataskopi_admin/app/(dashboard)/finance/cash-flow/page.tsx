import { PageHeader } from "@/components/layout/page-header"
import { CashFlowClient } from "@/components/finance/cash-flow-client"

export const dynamic = 'force-dynamic'

export default function CashFlowPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Laporan Arus Kas (Cash Flow)" />
            <CashFlowClient />
        </div>
    )
}
