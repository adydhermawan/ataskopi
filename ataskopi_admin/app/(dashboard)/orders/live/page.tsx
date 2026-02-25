import { getOrders, updateOrderStatus } from "@/actions/orders"
import { OrderBoard } from "./components/order-board"

import { PageHeader } from "@/components/layout/page-header"

export const dynamic = 'force-dynamic'

export default async function LiveOrdersPage() {
    const orders = await getOrders('live')

    return (
        <div className="flex-1 space-y-4">
            <PageHeader
                title="Pesanan Masuk"
                description="Monitor and manage live orders"
            />
            <OrderBoard initialOrders={orders} />
        </div>
    )
}
