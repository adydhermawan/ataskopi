"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { MoreHorizontal, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateStaffRole, updateStaffOutlet } from "@/actions/staff"
import { toast } from "sonner"
import { Outlet } from "@prisma/client"

export type StaffColumn = {
    id: string
    name: string
    phone: string
    email: string | null
    role: string
    outletId: string | null
    outletName: string
    createdAt: string
}

const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800",
    owner: "bg-blue-100 text-blue-800",
    kasir: "bg-green-100 text-green-800",
}

export const columns = (outlets: Outlet[]): ColumnDef<StaffColumn>[] => [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "phone",
        header: "Phone",
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
            <Badge className={roleColors[row.original.role] || "bg-gray-100 text-gray-800"}>
                {row.original.role.toUpperCase()}
            </Badge>
        ),
    },
    {
        accessorKey: "outletName",
        header: "Outlet",
        cell: ({ row }) => (
            <Badge variant="outline" className="font-normal">
                {row.original.outletName}
            </Badge>
        )
    },
    {
        accessorKey: "createdAt",
        header: "Joined",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const onRoleUpdate = async (newRole: string) => {
                const result = await updateStaffRole(row.original.id, newRole)
                if (result.success) {
                    toast.success("Staff role updated")
                } else {
                    toast.error(result.error)
                }
            }

            const onOutletUpdate = async (outletId: string | null) => {
                const result = await updateStaffOutlet(row.original.id, outletId)
                if (result.success) {
                    toast.success("Staff outlet updated")
                } else {
                    toast.error(result.error)
                }
            }

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
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Change Role</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onRoleUpdate("admin")}>
                            Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRoleUpdate("owner")}>
                            Owner
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRoleUpdate("kasir")}>
                            Kasir
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Assign Outlet</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onOutletUpdate(null)}>
                            Global / All Outlets
                        </DropdownMenuItem>
                        {outlets.map((outlet) => (
                            <DropdownMenuItem
                                key={outlet.id}
                                onClick={() => onOutletUpdate(outlet.id)}
                            >
                                {outlet.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
