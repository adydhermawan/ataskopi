import { PageHeader } from "@/components/layout/page-header"
import { ExpensesClient } from "@/components/finance/expenses-client"

export const dynamic = 'force-dynamic'

export default function ExpensesPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Pengeluaran (Expenses)" />
            <ExpensesClient />
        </div>
    )
}
