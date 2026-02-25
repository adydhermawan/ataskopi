"use client"

import { getOrders } from "@/actions/orders"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./components/columns"
import { OrderDetailsSheet } from "@/components/orders/order-details-sheet"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"

export default function OrderHistoryPage() {
    const [orders, setOrders] = useState<any[]>([])
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const fetchOrders = async () => {
        setIsLoading(true)
        const data = await getOrders('history')
        setOrders(data)
        setIsLoading(false)
    }

    // Since it's a server action but we need state, let's just use useEffect or keep it simple
    // Actually, the original was a server component. Let's convert to client component for interactivity.
    // Or keep it server and pass a client component that wraps the table.

    // Changing to client component strategy for order history detail view
    useEffect(() => {
        fetchOrders()
    }, [])

    const actionColumns = [
        ...columns,
        {
            id: "actions",
            cell: ({ row }: any) => {
                const order = row.original
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        Details
                    </Button>
                )
            }
        }
    ]

    return (
        <div className="flex-1 space-y-4">
            <PageHeader
                title={`Riwayat Pesanan (${orders.length})`}
                description="View completed and past orders"
            />
            {isLoading ? (
                <div className="h-24 flex items-center justify-center">Loading...</div>
            ) : (
                <DataTable searchKey="orderNumber" columns={actionColumns} data={orders} />
            )}
            <OrderDetailsSheet
                order={selectedOrder}
                isOpen={!!selectedOrder}
                onOpenChange={(open) => !open && setSelectedOrder(null)}
            />
        </div>
    )
}
