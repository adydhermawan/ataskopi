"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import {
    getInventoryPurchases,
    createInventoryPurchase,
    deleteInventoryPurchase,
    markPurchaseAsReceived,
    markPurchaseAsPaid,
    getPurchaseSummary,
    updateInventoryPurchase,
} from "@/actions/inventory-purchases";
import { checkAndUpdateOverdue } from "@/actions/check-overdue";
import { getRawMaterials } from "@/actions/raw-materials";
import {
    Plus,
    Trash,
    Loader2,
    ShoppingCart,
    Info,
    Package,
    Calendar,
    Coins,
    Truck,
    CreditCard,
    CheckCircle2,
    AlertTriangle,
    Clock,
    CircleDollarSign,
    Pencil,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface RawMaterialOption {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    averageCost: number;
}

interface Purchase {
    id: string;
    outletId: string;
    rawMaterialId: string;
    date: Date;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    supplier: string | null;
    notes: string | null;
    paymentMethod: string;
    paymentStatus: string;
    dueDate: Date | null;
    paidAt: Date | null;
    deliveryStatus: string;
    receivedAt: Date | null;
    rawMaterial: {
        id: string;
        name: string;
        unit: string;
    };
}

interface PurchaseSummaryData {
    totalPayables: number;
    payablesCount: number;
    overdueCount: number;
    totalShipping: number;
    shippingCount: number;
}

const PERIOD_OPTIONS = [
    { value: "this_month", label: "Bulan Ini" },
    { value: "last_month", label: "Bulan Lalu" },
    { value: "last_3_months", label: "3 Bulan Terakhir" },
    { value: "all", label: "Semua" },
];

const FILTER_STATUS_OPTIONS = [
    { value: "ALL", label: "Semua Status" },
    { value: "UNPAID", label: "Belum Lunas" },
    { value: "OVERDUE", label: "Jatuh Tempo" },
    { value: "PAID", label: "Lunas" },
];

const FILTER_DELIVERY_OPTIONS = [
    { value: "ALL", label: "Semua Barang" },
    { value: "SHIPPING", label: "Dalam Pengiriman" },
    { value: "RECEIVED", label: "Diterima" },
];

function PaymentStatusBadge({ status }: { status: string }) {
    switch (status) {
        case "PAID":
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-3 w-3" /> Lunas
                </span>
            );
        case "UNPAID":
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <Clock className="h-3 w-3" /> Belum Lunas
                </span>
            );
        case "OVERDUE":
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/30 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 animate-pulse">
                    <AlertTriangle className="h-3 w-3" /> Jatuh Tempo!
                </span>
            );
        default:
            return null;
    }
}

function DeliveryStatusBadge({ status }: { status: string }) {
    switch (status) {
        case "RECEIVED":
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-3 w-3" /> Diterima
                </span>
            );
        case "SHIPPING":
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    <Truck className="h-3 w-3" /> Pengiriman
                </span>
            );
        default:
            return null;
    }
}

export function InventoryPurchasesClient() {
    const { user } = useCurrentUser();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [outletId, setOutletId] = useState<string | null>(null);
    const [period, setPeriod] = useState("this_month");

    // Filters
    const [filterPayment, setFilterPayment] = useState("ALL");
    const [filterDelivery, setFilterDelivery] = useState("ALL");

    // Summary data
    const [summary, setSummary] = useState<PurchaseSummaryData | null>(null);

    // Raw materials for dropdown
    const [rawMaterials, setRawMaterials] = useState<RawMaterialOption[]>([]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formDate, setFormDate] = useState("");
    const [formRawMaterialId, setFormRawMaterialId] = useState("");
    const [formQuantity, setFormQuantity] = useState("");
    const [formUnitPrice, setFormUnitPrice] = useState("");
    const [formTotalAmount, setFormTotalAmount] = useState("");
    const [formSupplier, setFormSupplier] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formPaymentMethod, setFormPaymentMethod] = useState("CASH");
    const [formDueDate, setFormDueDate] = useState("");
    const [formDeliveryStatus, setFormDeliveryStatus] = useState("RECEIVED");
    const [formSubmitting, setFormSubmitting] = useState(false);

    // Action loading states
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Edit Modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
    const [editDate, setEditDate] = useState("");
    const [editPaymentMethod, setEditPaymentMethod] = useState("CASH");
    const [editPaymentStatus, setEditPaymentStatus] = useState("PAID");
    const [editDueDate, setEditDueDate] = useState("");

    useEffect(() => {
        if (user && user.role === "kasir" && user.outletId) {
            setOutletId(user.outletId);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetch("/api/outlets")
                .then((res) => res.json())
                .then((json) => {
                    if (json.success) {
                        setOutlets(json.data);
                        if (!outletId && json.data.length > 0) {
                            setOutletId(json.data[0].id);
                        }
                    }
                })
                .catch((err) => console.error("Failed to fetch outlets:", err));
        }
    }, [user]);

    // Fetch raw materials when outlet changes
    const fetchMaterials = async () => {
        if (!outletId) return;
        try {
            const data = await getRawMaterials(outletId);
            setRawMaterials(
                data.map((m) => ({
                    id: m.id,
                    name: m.name,
                    unit: m.unit,
                    currentStock: Number(m.currentStock),
                    averageCost: Number(m.averageCost),
                }))
            );
        } catch (err) {
            console.error("Failed to fetch raw materials:", err);
        }
    };

    useEffect(() => {
        if (user && outletId) fetchMaterials();
    }, [user, outletId]);

    // Check overdue on load
    useEffect(() => {
        if (user && outletId) {
            checkAndUpdateOverdue(outletId).catch(console.error);
        }
    }, [user, outletId]);

    const getDateRange = () => {
        const now = new Date();
        switch (period) {
            case "this_month":
                return { start: startOfMonth(now), end: endOfMonth(now) };
            case "last_month":
                const lastMonth = subMonths(now, 1);
                return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
            case "last_3_months":
                return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
            default:
                return { start: undefined, end: undefined };
        }
    };

    const fetchPurchases = async () => {
        if (!outletId) return;
        setLoading(true);
        try {
            const { start, end } = getDateRange();
            const data = await getInventoryPurchases(outletId, start, end, {
                paymentStatus: filterPayment,
                deliveryStatus: filterDelivery,
            });
            setPurchases(data.map((p) => ({
                ...p,
                quantity: Number(p.quantity),
                unitPrice: Number(p.unitPrice),
                totalAmount: Number(p.totalAmount),
                date: new Date(p.date),
                dueDate: p.dueDate ? new Date(p.dueDate) : null,
                paidAt: p.paidAt ? new Date(p.paidAt) : null,
                receivedAt: p.receivedAt ? new Date(p.receivedAt) : null,
            })));
        } catch (err) {
            console.error("Failed to fetch purchases:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        if (!outletId) return;
        try {
            const data = await getPurchaseSummary(outletId);
            setSummary(data);
        } catch (err) {
            console.error("Failed to fetch purchase summary:", err);
        }
    };

    useEffect(() => {
        if (user && outletId) {
            fetchPurchases();
            fetchSummary();
        }
    }, [user, outletId, period, filterPayment, filterDelivery]);

    const formatIDR = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalInventoryValue = rawMaterials.reduce((sum, m) => sum + (m.currentStock * m.averageCost), 0);

    const openCreateModal = () => {
        setFormDate(new Date().toLocaleDateString("en-CA"));
        setFormRawMaterialId("");
        setFormQuantity("");
        setFormUnitPrice("");
        setFormTotalAmount("");
        setFormSupplier("");
        setFormNotes("");
        setFormPaymentMethod("CASH");
        setFormDueDate(addDays(new Date(), 30).toLocaleDateString("en-CA"));
        setFormDeliveryStatus("RECEIVED");
        setIsModalOpen(true);
    };

    const selectedMaterial = rawMaterials.find((m) => m.id === formRawMaterialId);

    // Auto-calculate unitPrice if totalAmount & quantity are filled
    const handleQuantityChange = (val: string) => {
        setFormQuantity(val);
        if (formTotalAmount && val && Number(val) > 0) {
            setFormUnitPrice((Number(formTotalAmount) / Number(val)).toFixed(2));
        } else if (formUnitPrice && val && Number(val) > 0) {
            setFormTotalAmount((Number(formUnitPrice) * Number(val)).toFixed(0));
        }
    };

    const handleUnitPriceChange = (val: string) => {
        setFormUnitPrice(val);
        if (formQuantity && val && Number(formQuantity) > 0) {
            setFormTotalAmount((Number(formQuantity) * Number(val)).toFixed(0));
        }
    };

    const handleTotalAmountChange = (val: string) => {
        setFormTotalAmount(val);
        if (formQuantity && val && Number(formQuantity) > 0) {
            setFormUnitPrice((Number(val) / Number(formQuantity)).toFixed(2));
        }
    };

    const handleFormSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!outletId || !formRawMaterialId || !formQuantity || !formTotalAmount) return;
        setFormSubmitting(true);
        try {
            const qty = Number(formQuantity);
            const total = Number(formTotalAmount);
            const unitPriceVal = Number(formUnitPrice) || (total / qty);

            const res = await createInventoryPurchase({
                outletId,
                rawMaterialId: formRawMaterialId,
                date: new Date(formDate + "T00:00:00Z"),
                quantity: qty,
                unitPrice: unitPriceVal,
                totalAmount: total,
                supplier: formSupplier || undefined,
                notes: formNotes || undefined,
                paymentMethod: formPaymentMethod,
                dueDate: formPaymentMethod === "PAYLATER" && formDueDate
                    ? new Date(formDueDate + "T00:00:00Z")
                    : undefined,
                deliveryStatus: formDeliveryStatus,
            }) as any;

            if (res.success) {
                toast.success(res.message || "Pembelian bahan baku berhasil dicatat");
                setIsModalOpen(false);
                await fetchPurchases();
                await fetchMaterials();
                await fetchSummary();
            } else {
                toast.error(res.error || "Gagal mencatat pembelian");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setFormSubmitting(false);
        }
    };

    const openEditModal = (p: Purchase) => {
        setEditingPurchase(p);
        setEditDate(format(new Date(p.date), "yyyy-MM-dd"));
        setEditPaymentMethod(p.paymentMethod);
        setEditPaymentStatus(p.paymentStatus);
        setEditDueDate(p.dueDate ? format(new Date(p.dueDate), "yyyy-MM-dd") : addDays(new Date(), 30).toLocaleDateString("en-CA"));
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingPurchase(null);
    };

    const handleEditSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!editingPurchase) return;
        setFormSubmitting(true);
        try {
            const res = await updateInventoryPurchase(editingPurchase.id, {
                date: new Date(editDate + "T00:00:00Z"),
                paymentMethod: editPaymentMethod,
                paymentStatus: editPaymentStatus,
                dueDate: editPaymentMethod === "PAYLATER" && editDueDate ? new Date(editDueDate + "T00:00:00Z") : null,
            }) as any;

            if (res.success) {
                toast.success(res.message || "Pembelian berhasil diperbarui");
                closeEditModal();
                await fetchPurchases();
                await fetchSummary();
            } else {
                toast.error(res.error || "Gagal memperbarui pembelian");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus catatan pembelian ini? Stok bahan baku akan dikurangi (jika sudah diterima) dan harga modal akan disesuaikan kembali.")) return;
        try {
            const res = await deleteInventoryPurchase(id) as any;
            if (res.success) {
                toast.success("Pembelian berhasil dihapus");
                await fetchPurchases();
                await fetchMaterials();
                await fetchSummary();
            } else {
                toast.error(res.error || "Gagal menghapus");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        }
    };

    const handleMarkReceived = async (id: string) => {
        if (!confirm("Tandai barang sudah diterima? Stok bahan baku akan bertambah.")) return;
        setActionLoadingId(id);
        try {
            const res = await markPurchaseAsReceived(id) as any;
            if (res.success) {
                toast.success(res.message || "Barang telah diterima");
                await fetchPurchases();
                await fetchMaterials();
                await fetchSummary();
            } else {
                toast.error(res.error || "Gagal mengubah status");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleMarkPaid = async (id: string) => {
        if (!confirm("Tandai pembayaran sudah lunas?")) return;
        setActionLoadingId(id);
        try {
            const res = await markPurchaseAsPaid(id) as any;
            if (res.success) {
                toast.success(res.message || "Pembayaran berhasil dicatat lunas");
                await fetchPurchases();
                await fetchSummary();
            } else {
                toast.error(res.error || "Gagal mengubah status pembayaran");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setActionLoadingId(null);
        }
    };

    if (loading && !purchases.length) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-zinc-950 p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-3 flex-wrap">
                    {user && (user.role === "admin" || user.role === "owner") ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Outlet:</span>
                            <select
                                value={outletId || ""}
                                onChange={(e) => setOutletId(e.target.value || null)}
                                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                {outlets.map((o) => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : null}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Periode:</span>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            {PERIOD_OPTIONS.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <Button onClick={openCreateModal} className="w-full sm:w-auto flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" /> Catat Pembelian
                </Button>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pembelian Periode Ini</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{formatIDR(totalPurchases)}</div>
                        <p className="text-xs text-muted-foreground">Persediaan yang dibeli, belum terhitung COGS.</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nilai Persediaan Saat Ini (Asset)</CardTitle>
                        <Coins className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatIDR(totalInventoryValue)}</div>
                        <p className="text-xs text-muted-foreground">Perhitungan: Σ (Stok Aktual × Harga Modal Rata-rata).</p>
                    </CardContent>
                </Card>
                {/* Hutang Dagang */}
                <Card className={`border-l-4 shadow-sm ${(summary?.overdueCount || 0) > 0 ? 'border-l-red-500' : 'border-l-amber-500'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Hutang Dagang Aktif</CardTitle>
                        <CreditCard className={`h-4 w-4 ${(summary?.overdueCount || 0) > 0 ? 'text-red-500' : 'text-amber-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${(summary?.overdueCount || 0) > 0 ? 'text-red-600' : 'text-amber-600'}`}>
                            {formatIDR(summary?.totalPayables || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {summary?.payablesCount || 0} tagihan belum lunas
                            {(summary?.overdueCount || 0) > 0 && (
                                <span className="text-red-500 font-semibold"> • {summary?.overdueCount} jatuh tempo!</span>
                            )}
                        </p>
                    </CardContent>
                </Card>
                {/* Dalam Pengiriman */}
                <Card className="border-l-4 border-l-sky-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Barang Dalam Pengiriman</CardTitle>
                        <Truck className="h-4 w-4 text-sky-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sky-600">{formatIDR(summary?.totalShipping || 0)}</div>
                        <p className="text-xs text-muted-foreground">
                            {summary?.shippingCount || 0} pembelian menunggu diterima
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-zinc-950 p-3 rounded-lg border shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filter:</span>
                <select
                    value={filterPayment}
                    onChange={(e) => setFilterPayment(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                    {FILTER_STATUS_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>
                <select
                    value={filterDelivery}
                    onChange={(e) => setFilterDelivery(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                    {FILTER_DELIVERY_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                    <CardTitle>Daftar Pembelian Bahan Baku</CardTitle>
                    <CardDescription>Catat masuknya persediaan bahan baku. Transaksi ini menambah stok dan memperbarui harga modal rata-rata.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm block md:table">
                            <thead className="bg-slate-50 dark:bg-zinc-900 border-b hidden md:table-header-group">
                                <tr>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Tanggal</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Bahan Baku</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Jumlah</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Total</th>
                                    <th className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">Pembayaran</th>
                                    <th className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">Barang</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Supplier</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y block md:table-row-group">
                                {purchases.length === 0 ? (
                                    <tr className="block md:table-row">
                                        <td colSpan={8} className="p-8 text-center text-muted-foreground block md:table-cell">
                                            Belum ada riwayat pembelian. Klik &quot;Catat Pembelian&quot; untuk mulai.
                                        </td>
                                    </tr>
                                ) : (
                                    purchases.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors block md:table-row border-b md:border-none p-4 md:p-0 space-y-3 md:space-y-0">
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell font-medium">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider">Tanggal</span>
                                                <div className="text-right md:text-left">
                                                    <span>{format(new Date(p.date), "dd MMM yyyy", { locale: idLocale })}</span>
                                                    {p.dueDate && p.paymentStatus !== 'PAID' && (
                                                        <span className="block text-[10px] text-muted-foreground">
                                                            Jatuh tempo: {format(new Date(p.dueDate), "dd MMM yyyy", { locale: idLocale })}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell font-semibold text-slate-900 dark:text-white">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider">Bahan Baku</span>
                                                <span className="text-right md:text-left">{p.rawMaterial?.name || "Bahan Baku"}</span>
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-right">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider text-left">Jumlah</span>
                                                <span>{p.quantity} {p.rawMaterial?.unit}</span>
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-right font-bold text-slate-900 dark:text-white">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider text-left">Total</span>
                                                <span>{formatIDR(p.totalAmount)}</span>
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-center">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider text-left">Pembayaran</span>
                                                <div className="flex flex-col items-end md:items-center gap-1">
                                                    <PaymentStatusBadge status={p.paymentStatus} />
                                                    {p.paymentMethod === 'PAYLATER' && (
                                                        <span className="text-[9px] text-muted-foreground">Paylater</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-center">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider text-left">Barang</span>
                                                <DeliveryStatusBadge status={p.deliveryStatus} />
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-muted-foreground">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider">Supplier</span>
                                                <span className="text-right md:text-left">{p.supplier || "—"}</span>
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-right pt-3 md:pt-3 border-t md:border-none mt-3 md:mt-0">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider text-left">Aksi</span>
                                                <div className="flex justify-end gap-1 flex-wrap">
                                                    {p.deliveryStatus === 'SHIPPING' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleMarkReceived(p.id)}
                                                            disabled={actionLoadingId === p.id}
                                                            className="h-7 text-[10px] px-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
                                                        >
                                                            {actionLoadingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3 mr-1" />}
                                                            Diterima
                                                        </Button>
                                                    )}
                                                    {(p.paymentStatus === 'UNPAID' || p.paymentStatus === 'OVERDUE') && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleMarkPaid(p.id)}
                                                            disabled={actionLoadingId === p.id}
                                                            className="h-7 text-[10px] px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950"
                                                        >
                                                            {actionLoadingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CircleDollarSign className="h-3 w-3 mr-1" />}
                                                            Lunas
                                                        </Button>
                                                    )}
                                                    {user && (user.role === 'admin' || user.role === 'owner') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditModal(p)}
                                                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                                            title="Ubah Pembelian"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                                        <Trash className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal */}
            <Modal
                title="Catat Pembelian Bahan Baku"
                description="Masukkan detail pembelian bahan baku untuk meningkatkan stok dan menyesuaikan harga modal."
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            >
                <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Tanggal Pembelian *</label>
                            <input
                                type="date"
                                required
                                value={formDate}
                                onChange={(e) => setFormDate(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Bahan Baku *</label>
                            <select
                                required
                                value={formRawMaterialId}
                                onChange={(e) => setFormRawMaterialId(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="">— Pilih Bahan Baku —</option>
                                {rawMaterials.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({m.unit}) — stok: {m.currentStock}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedMaterial && (
                        <div className="space-y-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">
                                        Jumlah Beli ({selectedMaterial.unit}) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0.01"
                                        step="0.01"
                                        placeholder="0"
                                        value={formQuantity}
                                        onChange={(e) => handleQuantityChange(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-white dark:bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Harga per unit *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        placeholder="0"
                                        value={formUnitPrice}
                                        onChange={(e) => handleUnitPriceChange(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-white dark:bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Total Harga (Rp) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder="0"
                                        value={formTotalAmount}
                                        onChange={(e) => handleTotalAmountChange(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-white dark:bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                            </div>

                            {/* Comparison and moving average explanation */}
                            <div className="space-y-1 pt-1 border-t border-blue-200/50 dark:border-blue-800/50">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Info className="h-3.5 w-3.5 text-blue-500" />
                                    <span>
                                        Harga modal rata-rata saat ini: <strong>{formatIDR(selectedMaterial.averageCost)}/{selectedMaterial.unit}</strong>
                                    </span>
                                </div>
                                {Number(formUnitPrice) > 0 && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <span className="text-muted-foreground">Perubahan harga:</span>
                                        {Number(formUnitPrice) > selectedMaterial.averageCost ? (
                                            <span className="text-red-500 font-semibold">
                                                Lebih mahal {((Number(formUnitPrice) - selectedMaterial.averageCost) / (selectedMaterial.averageCost || 1) * 100).toFixed(1)}% dari rata-rata
                                            </span>
                                        ) : Number(formUnitPrice) < selectedMaterial.averageCost ? (
                                            <span className="text-green-500 font-semibold">
                                                Lebih murah {((selectedMaterial.averageCost - Number(formUnitPrice)) / (selectedMaterial.averageCost || 1) * 100).toFixed(1)}% dari rata-rata
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">Sama dengan rata-rata</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payment Method & Delivery Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> Metode Bayar
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormPaymentMethod("CASH")}
                                    className={`flex-1 h-9 rounded-md border text-xs font-medium transition-all ${
                                        formPaymentMethod === "CASH"
                                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 shadow-sm"
                                            : "bg-transparent border-input text-muted-foreground hover:bg-accent"
                                    }`}
                                >
                                    💵 Bayar Langsung
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormPaymentMethod("PAYLATER")}
                                    className={`flex-1 h-9 rounded-md border text-xs font-medium transition-all ${
                                        formPaymentMethod === "PAYLATER"
                                            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 shadow-sm"
                                            : "bg-transparent border-input text-muted-foreground hover:bg-accent"
                                    }`}
                                >
                                    🏷️ Paylater / Hutang
                                </button>
                            </div>
                            {formPaymentMethod === "PAYLATER" && (
                                <div className="space-y-1 pt-1">
                                    <label className="text-xs font-medium text-amber-700 dark:text-amber-400">Jatuh Tempo *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formDueDate}
                                        onChange={(e) => setFormDueDate(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-1.5">
                                <Truck className="h-3.5 w-3.5 text-muted-foreground" /> Status Barang
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormDeliveryStatus("RECEIVED")}
                                    className={`flex-1 h-9 rounded-md border text-xs font-medium transition-all ${
                                        formDeliveryStatus === "RECEIVED"
                                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 shadow-sm"
                                            : "bg-transparent border-input text-muted-foreground hover:bg-accent"
                                    }`}
                                >
                                    ✅ Langsung Diterima
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormDeliveryStatus("SHIPPING")}
                                    className={`flex-1 h-9 rounded-md border text-xs font-medium transition-all ${
                                        formDeliveryStatus === "SHIPPING"
                                            ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 shadow-sm"
                                            : "bg-transparent border-input text-muted-foreground hover:bg-accent"
                                    }`}
                                >
                                    🚚 Dalam Pengiriman
                                </button>
                            </div>
                            {formDeliveryStatus === "SHIPPING" && (
                                <div className="flex items-start gap-1.5 text-[11px] text-blue-700 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                    <span>Stok bahan baku baru bertambah setelah status diubah menjadi &quot;Diterima&quot;.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Supplier (Opsional)</label>
                            <input
                                type="text"
                                placeholder="Contoh: Toko Kopi Utama"
                                value={formSupplier}
                                onChange={(e) => setFormSupplier(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Keterangan (Opsional)</label>
                            <input
                                type="text"
                                placeholder="Contoh: Biji kopi Toraja premium"
                                value={formNotes}
                                onChange={(e) => setFormNotes(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={formSubmitting}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={formSubmitting || !formRawMaterialId || !formQuantity || !formTotalAmount}>
                            {formSubmitting ? "Menyimpan..." : "Simpan Pembelian"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                title="Ubah Pembelian Bahan Baku"
                description="Ubah tanggal pembelian, metode pembayaran, atau tanggal jatuh tempo."
                isOpen={isEditModalOpen}
                onClose={closeEditModal}
            >
                <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Tanggal Pembelian *</label>
                        <input
                            type="date"
                            required
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> Metode Bayar
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setEditPaymentMethod("CASH");
                                    setEditPaymentStatus("PAID");
                                }}
                                className={`flex-1 h-9 rounded-md border text-xs font-medium transition-all ${
                                    editPaymentMethod === "CASH"
                                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 shadow-sm"
                                        : "bg-transparent border-input text-muted-foreground hover:bg-accent"
                                }`}
                            >
                                💵 Bayar Langsung
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditPaymentMethod("PAYLATER");
                                    if (editPaymentStatus === "PAID") setEditPaymentStatus("UNPAID");
                                }}
                                className={`flex-1 h-9 rounded-md border text-xs font-medium transition-all ${
                                    editPaymentMethod === "PAYLATER"
                                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 shadow-sm"
                                        : "bg-transparent border-input text-muted-foreground hover:bg-accent"
                                }`}
                            >
                                🏷️ Paylater / Hutang
                            </button>
                        </div>
                    </div>

                    {editPaymentMethod === "PAYLATER" && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status Pembayaran</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditPaymentStatus("UNPAID")}
                                        className={`flex-1 h-9 rounded-md border text-xs font-medium transition-all ${
                                            editPaymentStatus !== "PAID"
                                                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 shadow-sm"
                                                : "bg-transparent border-input text-muted-foreground hover:bg-accent"
                                        }`}
                                    >
                                        ⏳ Belum Lunas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditPaymentStatus("PAID")}
                                        className={`flex-1 h-9 rounded-md border text-xs font-medium transition-all ${
                                            editPaymentStatus === "PAID"
                                                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 shadow-sm"
                                                : "bg-transparent border-input text-muted-foreground hover:bg-accent"
                                        }`}
                                    >
                                        ✅ Lunas
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-amber-700 dark:text-amber-400">Jatuh Tempo *</label>
                                <input
                                    type="date"
                                    required
                                    value={editDueDate}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={closeEditModal} disabled={formSubmitting}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={formSubmitting}>
                            {formSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
