"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { ProductWithRelations } from "@/actions/products"
import { Separator } from "@/components/ui/separator"
import { AddNewButton } from "@/components/rbac/add-new-button"

interface ProductClientProps {
    data: ProductWithRelations[]
}

export const ProductClient: React.FC<ProductClientProps> = ({
    data
}) => {

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Products ({data.length})</h2>
                    <p className="text-sm text-muted-foreground">Manage your menu items, prices, and variants.</p>
                </div>
                <AddNewButton href="/products/new" resource="products" />
            </div>
            <Separator className="my-4" />
            <DataTable searchKey="name" columns={columns} data={data} />
        </>
    )
}
