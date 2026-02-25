"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { updateOrderStatus, updatePaymentStatus } from "@/actions/orders"
import { useRouter } from "next/navigation"
import { useCanPerform } from "@/hooks/use-current-user"
import { format } from "date-fns"
import { Loader2, Eye, CreditCard } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { OrderDetailsSheet } from "@/components/orders/order-details-sheet"

interface OrderBoardProps {
    initialOrders: any[]
}

const statusMap: Record<string, { label: string, color: string, next?: string }> = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', next: 'preparing' },
    preparing: { label: 'Preparing', color: 'bg-blue-100 text-blue-800', next: 'ready' },
    ready: { label: 'Ready', color: 'bg-green-100 text-green-800', next: 'completed' },
    on_delivery: { label: 'On Delivery', color: 'bg-indigo-100 text-indigo-800', next: 'completed' },
}

export function OrderBoard({ initialOrders }: OrderBoardProps) {
    const router = useRouter()
    const canUpdate = useCanPerform('update', 'orders')
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

    const handleStatusUpdate = async (order: any, newStatus: string) => {
        const isUnpaid = order.paymentStatus === 'pending'
        const isManualPayment = order.paymentMethod === 'cash' || order.paymentMethod === 'manual'

        // 1. Block transition to preparing if unpaid (except for cash/manual)
        if (newStatus === 'preparing' && isUnpaid && !isManualPayment) {
            alert('Cannot start preparing. Order must be PAID first.')
            return
        }

        // 2. Block transition to completed if cash/manual and still unpaid
        if (newStatus === 'completed' && isManualPayment && isUnpaid) {
            alert('Cannot complete order. Cash payment must be marked as PAID first.')
            return
        }

        setLoadingId(order.id)
        try {
            const result = await updateOrderStatus(order.id, newStatus)
            if (!result.success) {
                alert(result.error)
            } else {
                router.refresh()
            }
        } catch (error) {
            console.error("Failed to update status", error)
        } finally {
            setLoadingId(null)
        }
    }

    const handlePaymentUpdate = async (id: string) => {
        if (!confirm('Mark this order as PAID?')) return
        setLoadingId(id)
        try {
            const result = await updatePaymentStatus(id, 'paid')
            if (!result.success) {
                alert(result.error)
            } else {
                // Update local selected order if open
                if (selectedOrder && selectedOrder.id === id) {
                    setSelectedOrder({ ...selectedOrder, paymentStatus: 'paid' })
                }
                router.refresh()
            }
        } catch (error) {
            console.error("Failed to update payment", error)
        } finally {
            setLoadingId(null)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {initialOrders.map((order) => {
                    const status = statusMap[order.orderStatus] || { label: order.orderStatus, color: 'bg-gray-100' }
                    const isUnpaid = order.paymentStatus === 'pending'
                    const isManualPayment = order.paymentMethod === 'cash' || order.paymentMethod === 'manual'

                    return (
                        <Card
                            key={order.id}
                            className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedOrder(order)}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">#{order.orderNumber}</CardTitle>
                                <Badge className={status.color} variant="outline">
                                    {status.label}
                                </Badge>
                            </CardHeader>
                            <CardContent onClick={(e) => e.stopPropagation()}>
                                <div className="text-2xl font-bold mb-1" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}>{order.user.name}</div>
                                <div className="flex items-center gap-x-2 text-xs text-muted-foreground mb-4">
                                    <span className="font-semibold text-primary">{order.outlet.name}</span>
                                    <span>•</span>
                                    <span>{format(new Date(order.createdAt), 'HH:mm')}</span>
                                    <span>•</span>
                                    <span>{order.orderType}</span>
                                </div>

                                <div className="space-y-2 mb-4">
                                    {order.items.slice(0, 3).map((item: any) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span>{item.quantity}x {item.product.name}</span>
                                            <span className="text-muted-foreground">
                                                {(item.selectedModifiers?.length > 0 || item.variant) ? '*' : ''}
                                            </span>
                                        </div>
                                    ))}
                                    {order.items.length > 3 && (
                                        <p className="text-xs text-muted-foreground text-center pt-1">
                                            +{order.items.length - 3} more items...
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Details
                                    </Button>

                                    {canUpdate && status.next && (
                                        <>
                                            {order.orderStatus === 'pending' && isUnpaid && !isManualPayment ? (
                                                <Button
                                                    size="sm"
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handlePaymentUpdate(order.id)}
                                                    disabled={loadingId === order.id}
                                                >
                                                    {loadingId === order.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <span className="flex items-center">
                                                            <CreditCard className="w-3.5 h-3.5 mr-1" />
                                                            <span className="truncate">Confirm Payment</span>
                                                        </span>
                                                    )}
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleStatusUpdate(order, status.next!)}
                                                    disabled={loadingId === order.id}
                                                >
                                                    {loadingId === order.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <span className="truncate">To {statusMap[status.next]?.label || status.next}</span>
                                                    )}
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>

                                {isUnpaid && isManualPayment && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handlePaymentUpdate(order.id)}
                                        disabled={loadingId === order.id}
                                    >
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        Mark Paid (Cash)
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}

                {initialOrders.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No active orders at the moment.
                    </div>
                )}
            </div>

            <OrderDetailsSheet
                order={selectedOrder}
                isOpen={!!selectedOrder}
                onOpenChange={(open) => !open && setSelectedOrder(null)}
                onPaymentUpdate={handlePaymentUpdate}
                loadingId={loadingId}
            />
        </>
    )
}


