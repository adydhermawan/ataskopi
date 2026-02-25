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
import { deleteCategory } from "@/actions/categories"
import { useRouter } from "next/navigation"
import { useCanPerform } from "@/hooks/use-current-user"

type Category = {
    id: string
    name: string
    slug: string
    sortOrder: number
}

function ActionsCell({ category }: { category: Category }) {
    const router = useRouter()
    const canUpdate = useCanPerform('update', 'categories')
    const canDelete = useCanPerform('delete', 'categories')

    const onDelete = async () => {
        if (confirm("Are you sure you want to delete this category?")) {
            await deleteCategory(category.id)
            router.refresh()
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
                    <DropdownMenuItem onClick={() => router.push(`/categories/${category.id}`)}>
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

export const columns: ColumnDef<Category>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "slug",
        header: "Slug",
    },
    {
        accessorKey: "sortOrder",
        header: "Sort Order",
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionsCell category={row.original} />,
    },
]
