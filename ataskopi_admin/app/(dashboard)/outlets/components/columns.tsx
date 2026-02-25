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
import { deleteOutlet } from "@/actions/outlets"
import { useRouter } from "next/navigation"
import { useCanPerform } from "@/hooks/use-current-user"

type Outlet = {
    id: string
    name: string
    address: string
    isActive: boolean
}

function ActionsCell({ outlet }: { outlet: Outlet }) {
    const router = useRouter()
    const canUpdate = useCanPerform('update', 'outlets')
    const canDelete = useCanPerform('delete', 'outlets')

    const onDelete = async () => {
        if (confirm("Are you sure you want to delete this outlet?")) {
            await deleteOutlet(outlet.id)
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
                    <DropdownMenuItem onClick={() => router.push(`/outlets/${outlet.id}`)}>
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

export const columns: ColumnDef<Outlet>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "address",
        header: "Address",
    },
    {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => {
            const isActive = row.getValue("isActive")
            return (
                <span className={`px-2 py-1 rounded-full text-xs ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isActive ? 'Active' : 'Inactive'}
                </span>
            )
        }
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionsCell outlet={row.original} />,
    },
]
