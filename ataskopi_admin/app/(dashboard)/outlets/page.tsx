import { getOutlets } from "@/actions/outlets"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { columns } from "./components/columns"
import { AddNewButton } from "@/components/rbac/add-new-button"

import { PageHeader } from "@/components/layout/page-header"

export const dynamic = 'force-dynamic'

export default async function OutletsPage() {
    const outlets = await getOutlets()

    const formattedOutlets = outlets.map((outlet) => ({
        ...outlet,
        address: outlet.address || "",
        phone: outlet.phone || "",
        latitude: outlet.latitude ? Number(outlet.latitude) : null,
        longitude: outlet.longitude ? Number(outlet.longitude) : null,
    }))

    return (
        <div className="flex-1 space-y-4">
            <PageHeader
                title={`Outlets (${outlets.length})`}
                description="Manage outlet locations"
            >
                <AddNewButton href="/outlets/new" resource="outlets" />
            </PageHeader>
            <DataTable searchKey="name" columns={columns} data={formattedOutlets} />
        </div>
    )
}
