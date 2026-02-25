import { getCustomers } from "@/actions/customers"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./components/columns"

import { PageHeader } from "@/components/layout/page-header"

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
    const customers = await getCustomers()

    return (
        <div className="flex-1 space-y-4">
            <PageHeader
                title={`Pelanggan (${customers.length})`}
                description="Manage customer data"
            />
            <DataTable searchKey="name" columns={columns} data={customers} />
        </div>
    )
}
