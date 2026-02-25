"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value)
}

export const columns: ColumnDef<any>[] = [
    {
        accessorKey: "orderNumber",
        header: "Order No",
        cell: ({ row }) => <span className="font-mono">{row.getValue("orderNumber")}</span>
    },
    {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => format(new Date(row.getValue("createdAt")), "dd MMM yyyy HH:mm"),
    },
    {
        accessorKey: "user.name",
        header: "Customer",
    },
    {
        accessorKey: "outlet.name",
        header: "Outlet",
        cell: ({ row }) => <span className="font-semibold text-primary">{row.original.outlet?.name}</span>
    },
    {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => formatCurrency(Number(row.getValue("total"))),
    },
    {
        accessorKey: "orderStatus",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("orderStatus") as string
            let color = "bg-gray-100"

            if (status === 'completed') color = "bg-green-100 text-green-800"
            if (status === 'cancelled') color = "bg-red-100 text-red-800"
            if (status === 'rejected') color = "bg-red-100 text-red-800"

            return (
                <Badge className={color} variant="outline" style={{ textTransform: 'capitalize' }}>
                    {status}
                </Badge>
            )
        }
    },
    {
        accessorKey: "paymentStatus",
        header: "Payment",
        cell: ({ row }) => {
            const status = row.getValue("paymentStatus") as string
            return (
                <span className="capitalize text-sm">{status}</span>
            )
        }
    }
]
