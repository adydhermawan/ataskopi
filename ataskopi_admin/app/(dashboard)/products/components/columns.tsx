"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Edit, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteProduct, ProductWithRelations } from "@/actions/products"
import { useRouter } from "next/navigation"

// Helper to format currency
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value)
}

import { useCanPerform } from "@/hooks/use-current-user"

// Actions cell component with permission check
function ActionsCell({ product }: { product: ProductWithRelations }) {
    const router = useRouter();
    const canUpdate = useCanPerform('update', 'products')
    const canDelete = useCanPerform('delete', 'products')

    const onDelete = async () => {
        if (confirm("Are you sure you want to delete this product?")) {
            await deleteProduct(product.id);
            router.refresh();
        }
    }

    if (!canUpdate && !canDelete) return null

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {canUpdate && (
                    <DropdownMenuItem onClick={() => router.push(`/products/${product.id}`)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                )}
                {canDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                        <Trash className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export const columns: ColumnDef<ProductWithRelations>[] = [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
            const isRecommended = row.original.isRecommended
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{row.getValue("name")}</span>
                    {isRecommended && <span className="text-xs text-amber-600 font-semibold">Recommended</span>}
                </div>
            )
        }
    },
    {
        accessorKey: "category.name",
        header: "Category",
    },
    {
        accessorKey: "basePrice",
        header: "Price",
        cell: ({ row }) => formatCurrency(Number(row.getValue("basePrice"))),
    },
    {
        accessorKey: "options",
        header: "Variants",
        cell: ({ row }) => {
            const options = row.original.options;
            if (options.length === 0) return <span className="text-muted-foreground">-</span>
            return <span>{options.length} Options</span>
        }
    },
    {
        accessorKey: "isAvailable",
        header: "Status",
        cell: ({ row }) => {
            const isActive = row.getValue("isAvailable")
            return (
                <span className={`px-2 py-1 rounded-full text-xs ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isActive ? 'Active' : 'Unavailable'}
                </span>
            )
        }
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionsCell product={row.original} />,
    },
]
