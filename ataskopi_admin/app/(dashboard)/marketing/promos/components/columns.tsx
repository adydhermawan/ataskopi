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
import { Promo } from "@prisma/client"
import { deletePromo } from "@/actions/promos"
import { toast } from "sonner"
import Image from "next/image"

export const columns = (onEdit: (promo: Promo) => void): ColumnDef<Promo>[] => [
    {
        accessorKey: "bannerUrl",
        header: "Banner",
        cell: ({ row }) => (
            <div className="relative h-12 w-24 overflow-hidden rounded-md border">
                <Image
                    src={row.original.bannerUrl}
                    alt={row.original.title}
                    fill
                    className="object-cover"
                />
            </div>
        )
    },
    {
        accessorKey: "title",
        header: "Title",
    },
    {
        accessorKey: "displayOrder",
        header: "Order",
    },
    {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
            <span className={row.original.isActive ? "text-green-600 font-medium" : "text-gray-400"}>
                {row.original.isActive ? "Active" : "Hidden"}
            </span>
        )
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const promo = row.original;

            const onDelete = async () => {
                if (confirm("Delete this promo?")) {
                    const result = await deletePromo(promo.id);
                    if (result.success) {
                        toast.success("Promo deleted");
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
                        <DropdownMenuItem onClick={() => onEdit(promo)}>
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
