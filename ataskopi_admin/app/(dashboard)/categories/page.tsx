import { getCategories } from "@/actions/categories"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { columns } from "./components/columns"
import { AddNewButton } from "@/components/rbac/add-new-button"

import { PageHeader } from "@/components/layout/page-header"

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
    const categories = await getCategories()

    return (
        <div className="flex-1 space-y-4">
            <PageHeader
                title={`Categories (${categories.length})`}
                description="Manage product categories"
            >
                <AddNewButton href="/categories/new" resource="categories" />
            </PageHeader>
            <DataTable searchKey="name" columns={columns} data={categories} />
        </div>
    )
}
