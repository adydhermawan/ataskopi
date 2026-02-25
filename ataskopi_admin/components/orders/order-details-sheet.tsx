"use client"

import { format } from "date-fns"
import { Loader2, Calendar, User, ShoppingBag, CreditCard, FileText, MapPin, Phone, Mail, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface OrderDetailsSheetProps {
    order: any | null
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onPaymentUpdate?: (id: string) => Promise<void>
    loadingId?: string | null
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount)
}

export function OrderDetailsSheet({
    order,
    isOpen,
    onOpenChange,
    onPaymentUpdate,
    loadingId
}: OrderDetailsSheetProps) {
    if (!order) return null

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200'
            case 'cancelled':
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200'
            case 'preparing': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'ready': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            default: return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }

    const getPaymentStatusColor = (status: string) => {
        return status.toLowerCase() === 'paid'
            ? 'bg-green-600 text-white shadow-sm'
            : 'bg-rose-600 text-white shadow-sm'
    }

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl px-0 border-l-0 shadow-2xl flex flex-col h-full">
                <SheetHeader className="px-6 py-4 border-b bg-white shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="bg-primary/10 text-primary p-1.5 rounded-lg shrink-0">
                                <ShoppingBag className="w-5 h-5" />
                            </span>
                            <SheetTitle className="text-xl font-bold tracking-tight truncate">#{order.orderNumber}</SheetTitle>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Badge className={`${getStatusColor(order.orderStatus)} border px-2.5 py-0.5 capitalize font-semibold shadow-none whitespace-nowrap`}>
                                {order.orderStatus}
                            </Badge>
                            <Badge className={`${getPaymentStatusColor(order.paymentStatus)} border-0 px-2.5 py-0.5 font-bold uppercase whitespace-nowrap`}>
                                {order.paymentStatus}
                            </Badge>
                        </div>
                    </div>
                    <SheetDescription className="flex items-center flex-wrap gap-4 text-sm font-medium">
                        <span className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm')}
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                            <ShoppingBag className="w-4 h-4" />
                            {order.outlet.name}
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                            <MapPin className="w-4 h-4" />
                            {order.orderType === 'dine_in' ? 'Dine In' : order.orderType === 'pickup' ? 'Pickup' : 'Delivery'}
                        </span>
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Main Column: Order Items */}
                        <div className="md:col-span-2 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <ShoppingBag className="w-4 h-4 text-primary" />
                                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Order Items</h4>
                            </div>

                            <div className="space-y-3">
                                {order.items.map((item: any) => (
                                    <div key={item.id} className="group relative bg-white border border-slate-100 p-3 rounded-xl hover:shadow-sm transition-all duration-200">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex gap-3 min-w-0">
                                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-900 font-bold text-xs shrink-0 mt-0.5">
                                                    {item.quantity}
                                                </div>
                                                <div className="min-w-0">
                                                    <h5 className="font-bold text-sm text-slate-900 leading-tight">{item.product.name}</h5>
                                                    <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                                                        {item.variant && (
                                                            <div className="flex items-center text-[10px] font-medium text-slate-500">
                                                                <span className="mr-1">Variant:</span>
                                                                <span className="text-slate-900">{item.variant.name}</span>
                                                            </div>
                                                        )}
                                                        {item.selectedOptions?.map((opt: any) => (
                                                            <div key={opt.id} className="flex items-center text-[10px] font-medium text-slate-500">
                                                                <span className="mr-1">{opt.optionValue.option.name}:</span>
                                                                <span className="text-slate-900">{opt.optionValue.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                            {item.selectedModifiers.map((mod: any) => (
                                                                <span key={mod.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                                                    + {mod.modifier.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {item.notes && (
                                                        <div className="mt-2 flex items-start gap-1.5 p-1.5 bg-amber-50 rounded border border-amber-100">
                                                            <FileText className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                                                            <p className="text-[11px] text-amber-900 italic font-medium leading-tight">"{item.notes}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="font-bold text-sm text-slate-900 whitespace-nowrap">{formatCurrency(item.unitPrice * item.quantity)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Side Column: Details & Payment */}
                        <div className="space-y-6">
                            {/* Customer Info */}
                            <section className="bg-white border border-slate-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <User className="w-4 h-4 text-primary" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer</h4>
                                </div>
                                <div className="space-y-2">
                                    <p className="font-bold text-sm text-slate-900 truncate">{order.user.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <Phone className="w-3 h-3" />
                                        {order.user.phone}
                                    </div>
                                    {order.user.email && (
                                        <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
                                            <Mail className="w-3 h-3" />
                                            {order.user.email}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Service Details */}
                            {(order.orderType === 'dine_in' || order.orderType === 'pickup' || order.orderType === 'delivery') && (
                                <section className="bg-white border border-slate-100 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <MapPin className="w-4 h-4 text-primary" />
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {order.orderType === 'dine_in' && order.table && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground text-xs font-medium">Table</span>
                                                <span className="font-bold text-slate-900">{order.table.tableNumber}</span>
                                            </div>
                                        )}
                                        {order.orderType === 'pickup' && order.scheduledTime && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground text-xs font-medium">Pickup Time</span>
                                                <span className="font-bold text-slate-900">{format(new Date(order.scheduledTime), 'HH:mm')}</span>
                                            </div>
                                        )}
                                        {order.orderType === 'delivery' && order.deliveryAddress && (
                                            <div className="space-y-2">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-muted-foreground text-[10px] uppercase font-bold">Address</span>
                                                    <p className="text-xs text-slate-600 leading-relaxed">
                                                        {typeof order.deliveryAddress === 'string'
                                                            ? order.deliveryAddress
                                                            : (order.deliveryAddress as any).address}
                                                    </p>
                                                </div>
                                                {(order.deliveryAddress as any).latitude && (order.deliveryAddress as any).longitude && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full justify-start h-8 text-[10px] font-bold"
                                                        onClick={() => {
                                                            const { latitude, longitude } = order.deliveryAddress as any;
                                                            window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
                                                        }}
                                                    >
                                                        <ExternalLink className="w-3 h-3 mr-2" />
                                                        Open Maps
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Payment Summary */}
                            <section className="bg-slate-900 text-white rounded-xl p-5 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none select-none">
                                    <CreditCard className="w-20 h-20 rotate-12" />
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <CreditCard className="w-4 h-4 text-primary" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment</h4>
                                </div>
                                <div className="space-y-2 relative z-10">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 font-medium">Subtotal</span>
                                        <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 font-medium">Tax</span>
                                        <span className="font-medium">{formatCurrency(order.tax)}</span>
                                    </div>
                                    {order.discount > 0 && (
                                        <div className="flex justify-between text-xs text-green-400 font-bold">
                                            <span>Discount</span>
                                            <span>-{formatCurrency(order.discount)}</span>
                                        </div>
                                    )}
                                    <div className="pt-3 mt-1 border-t border-slate-800">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="text-slate-400 font-bold text-xs uppercase">Total</span>
                                            <span className="text-xl font-black text-white">{formatCurrency(order.total)}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">via {order.paymentMethod}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Manual Payment Action */}
                            {onPaymentUpdate && order.paymentStatus === 'pending' && (
                                <div className="pt-2">
                                    <Button
                                        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-md rounded-xl transition-all active:scale-[0.98]"
                                        onClick={() => onPaymentUpdate(order.id)}
                                        disabled={loadingId === order.id}
                                    >
                                        {loadingId === order.id ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <CreditCard className="w-4 h-4 mr-2" />
                                        )}
                                        CONFIRM PAID
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
