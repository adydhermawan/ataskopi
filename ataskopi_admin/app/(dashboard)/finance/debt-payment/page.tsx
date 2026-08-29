import { PageHeader } from "@/components/layout/page-header"
import { DebtPaymentClient } from "@/components/finance/debt-payment-client"

export const dynamic = 'force-dynamic'

export default function DebtPaymentPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Bayar Hutang (Paylater)" />
            <DebtPaymentClient />
        </div>
    )
}
