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
import { Voucher } from "@prisma/client"
import { format } from "date-fns"
import { deleteVoucher } from "@/actions/vouchers"
import { toast } from "sonner"

export const columns = (onEdit: (voucher: Voucher) => void): ColumnDef<Voucher>[] => [
    {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => <span className="font-mono font-bold">{row.getValue("code")}</span>
    },
    {
        accessorKey: "discountValue",
        header: "Discount",
        cell: ({ row }) => {
            const type = row.original.discountType;
            const value = Number(row.original.discountValue);
            return type === "FIXED"
                ? `Rp ${value.toLocaleString()}`
                : `${value}% OFF`;
        }
    },
    {
        accessorKey: "usageLimit",
        header: "Usage",
        cell: ({ row }) => {
            const limit = row.original.usageLimit;
            const used = row.original.usedCount;
            return <span>{used} / {limit ?? "∞"}</span>
        }
    },
    {
        accessorKey: "endDate",
        header: "Expires",
        cell: ({ row }) => {
            const date = row.original.endDate;
            return date ? format(new Date(date), "dd MMM yyyy") : "No Expiry";
        }
    },
    {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
            <span className={row.original.isActive ? "text-green-600" : "text-gray-400"}>
                {row.original.isActive ? "Active" : "Inactive"}
            </span>
        )
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const voucher = row.original;

            const onDelete = async () => {
                if (confirm("Delete this voucher? This cannot be undone.")) {
                    const result = await deleteVoucher(voucher.id);
                    if (result.success) {
                        toast.success("Voucher deleted");
                    } else {
                        toast.error("Failed to delete");
                    }
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
                        <DropdownMenuItem onClick={() => onEdit(voucher)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="text-red-600">
                            <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
