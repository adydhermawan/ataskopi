import { PageHeader } from "@/components/layout/page-header"
import { BalanceSheetClient } from "@/components/finance/balance-sheet-client"

export const dynamic = 'force-dynamic'

export default function BalanceSheetPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Laporan Neraca" />
            <BalanceSheetClient />
        </div>
    )
}
