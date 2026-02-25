"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useCanPerform } from "@/hooks/use-current-user"
import { format } from "date-fns"

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value)
}

function ActionsCell({ customer }: { customer: any }) {
    const router = useRouter()
    const canUpdate = useCanPerform('update', 'customers')

    if (!canUpdate) return null

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
                <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export const columns: ColumnDef<any>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "phone",
        header: "Phone",
    },
    {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.getValue("email") || "-"
    },
    {
        accessorKey: "orders",
        header: "Total Orders",
        cell: ({ row }) => {
            const orders = row.getValue("orders") as any[]
            return <span>{orders.length} orders</span>
        }
    },
    {
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ row }) => format(new Date(row.getValue("createdAt")), "dd MMM yyyy"),
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionsCell customer={row.original} />,
    },
]
