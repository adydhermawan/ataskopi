"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
} from "@/actions/expenses";
import { createAsset } from "@/actions/assets";
import {
    Plus,
    Edit,
    Trash,
    Loader2,
    Receipt,
    TrendingDown,
    Wallet,
    ArrowDownUp,
    CreditCard,
    Truck,
    Info,
    Clock,
    CheckCircle2,
    AlertTriangle,
    CircleDollarSign,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface Expense {
    id: string;
    outletId: string;
    date: Date;
    category: string;
    amount: number;
    description: string | null;
    paymentMethod: string;
    paymentSource: string | null;
    paymentStatus: string;
    dueDate: Date | null;
    omzetDate: Date | null;
    paidAt: Date | null;
    deliveryStatus: string;
    receivedAt: Date | null;
}

type EntryType = "OPEX" | "CAPEX";

const EXPENSE_CATEGORIES = [
    { value: "OPERATIONAL", label: "Operasional" },
    { value: "SALARY", label: "Gaji Karyawan" },
    { value: "UTILITY", label: "Utilitas (Listrik/Air/Gas)" },
    { value: "RENT", label: "Sewa Tempat" },
    { value: "OTHER", label: "Lain-lain" },
];

const USEFUL_LIFE_OPTIONS = [
    { value: 3, label: "3 Bulan" },
    { value: 6, label: "6 Bulan" },
    { value: 12, label: "12 Bulan (1 Tahun)" },
    { value: 24, label: "24 Bulan (2 Tahun)" },
    { value: 36, label: "36 Bulan (3 Tahun)" },
    { value: 48, label: "48 Bulan (4 Tahun)" },
    { value: 60, label: "60 Bulan (5 Tahun)" },
];

const CATEGORY_COLORS: Record<string, string> = {
    OPERATIONAL: "bg-blue-100 text-blue-700",
    SALARY: "bg-purple-100 text-purple-700",
    UTILITY: "bg-amber-100 text-amber-700",
    RENT: "bg-cyan-100 text-cyan-700",
    STOCK_LOSS: "bg-red-100 text-red-700",
    DEPRECIATION: "bg-slate-100 text-slate-600",
    OTHER: "bg-slate-100 text-slate-700",
};

const PERIOD_OPTIONS = [
    { value: "this_month", label: "Bulan Ini" },
    { value: "last_month", label: "Bulan Lalu" },
    { value: "last_3_months", label: "3 Bulan Terakhir" },
    { value: "all", label: "Semua" },
];

const PAYMENT_SOURCE_OPTIONS = [
    { value: "", label: "— Pilih Layanan —" },
    { value: "Cash", label: "Cash (Uang Fisik)" },
    { value: "Jago Atas Kopi", label: "Jago Atas Kopi" },
    { value: "Jago Ady", label: "Jago Ady" },
    { value: "Mandiri", label: "Mandiri" },
    { value: "Denik", label: "Denik" },
];

export function calculatePaylaterDueDate(dateStr: string): string {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const txDate = new Date(Date.UTC(year, month, day));
    const estCompletion = new Date(txDate);
    estCompletion.setUTCDate(estCompletion.getUTCDate() + 4);

    const compDay = estCompletion.getUTCDate();
    let billYear = estCompletion.getUTCFullYear();
    let billMonth = estCompletion.getUTCMonth();

    if (compDay >= 25) {
        billMonth += 1;
        if (billMonth > 11) {
            billMonth = 0;
            billYear += 1;
        }
    }

    const dueDate = new Date(Date.UTC(billYear, billMonth + 1, 0));
    return dueDate.toISOString().split("T")[0];
}

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

export function ExpensesClient() {
    const { user } = useCurrentUser();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [outletId, setOutletId] = useState<string | null>(null);
    const [period, setPeriod] = useState("this_month");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Expense | null>(null);
    const [entryType, setEntryType] = useState<EntryType>("OPEX");

    // OpEx form fields
    const [formDate, setFormDate] = useState("");
    const [formCategory, setFormCategory] = useState("OPERATIONAL");
    const [formAmount, setFormAmount] = useState("");
    const [formDescription, setFormDescription] = useState("");

    // CapEx (Asset) form fields
    const [formAssetName, setFormAssetName] = useState("");
    const [formAssetDate, setFormAssetDate] = useState("");
    const [formAssetPrice, setFormAssetPrice] = useState("");
    const [formUsefulLife, setFormUsefulLife] = useState(12);
    const [formAssetNotes, setFormAssetNotes] = useState("");

    // Payment & delivery form fields
    const [formPaymentMethod, setFormPaymentMethod] = useState("CASH");
    const [formPaymentSource, setFormPaymentSource] = useState("");
    const [formDueDate, setFormDueDate] = useState("");
    const [formOmzetDate, setFormOmzetDate] = useState("");
    const [formDeliveryStatus, setFormDeliveryStatus] = useState("RECEIVED");

    const [formSubmitting, setFormSubmitting] = useState(false);

    // Action loading states
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

    const fetchExpenses = async () => {
        if (!outletId) return;
        setLoading(true);
        try {
            const { start, end } = getDateRange();
            const data = await getExpenses(outletId, start, end);
            setExpenses(data.map((e) => ({
                ...e,
                amount: Number(e.amount),
                date: new Date(e.date),
                dueDate: e.dueDate ? new Date(e.dueDate) : null,
                omzetDate: e.omzetDate ? new Date(e.omzetDate) : null,
                paidAt: e.paidAt ? new Date(e.paidAt) : null,
                receivedAt: e.receivedAt ? new Date(e.receivedAt) : null,
            })));
        } catch (err) {
            console.error("Failed to fetch expenses:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && outletId) fetchExpenses();
    }, [user, outletId, period]);

    const formatIDR = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expensesByCategory = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);

    const openCreateModal = () => {
        setEditingItem(null);
        setEntryType("OPEX");
        const todayStr = new Date().toLocaleDateString("en-CA");
        // Reset OpEx fields
        setFormDate(todayStr);
        setFormCategory("OPERATIONAL");
        setFormAmount("");
        setFormDescription("");
        // Reset payment/delivery fields
        setFormPaymentMethod("CASH");
        setFormPaymentSource("");
        setFormDueDate(calculatePaylaterDueDate(todayStr));
        setFormOmzetDate(todayStr);
        setFormDeliveryStatus("RECEIVED");
        // Reset CapEx fields
        setFormAssetName("");
        setFormAssetDate(todayStr);
        setFormAssetPrice("");
        setFormUsefulLife(12);
        setFormAssetNotes("");
        setIsModalOpen(true);
    };

    const openEditModal = (e: Expense) => {
        setEditingItem(e);
        setEntryType("OPEX"); // Editing is always OpEx (assets are edited from asset page)
        setFormDate(format(new Date(e.date), "yyyy-MM-dd"));
        setFormCategory(e.category);
        setFormAmount(e.amount.toString());
        setFormDescription(e.description || "");
        setFormPaymentMethod(e.paymentMethod || "CASH");
        setFormPaymentSource(e.paymentSource || "");
        setFormDueDate(e.dueDate ? format(new Date(e.dueDate), "yyyy-MM-dd") : "");
        setFormOmzetDate(e.omzetDate ? format(new Date(e.omzetDate), "yyyy-MM-dd") : format(new Date(e.date), "yyyy-MM-dd"));
        setFormDeliveryStatus(e.deliveryStatus || "RECEIVED");
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!outletId) return;
        setFormSubmitting(true);
        try {
            let res;
            if (entryType === "CAPEX" && !editingItem) {
                // Create asset (CapEx)
                res = await createAsset({
                    outletId,
                    name: formAssetName,
                    purchaseDate: new Date(formAssetDate + "T00:00:00Z"),
                    purchasePrice: Number(formAssetPrice),
                    usefulLifeMonths: formUsefulLife,
                    notes: formAssetNotes || undefined,
                });
                if (res.success) {
                    toast.success("Pembelian aset berhasil dicatat");
                    setIsModalOpen(false);
                    // Optionally refresh — CapEx doesn't show in expenses list
                } else {
                    toast.error(res.error || "Gagal mencatat aset");
                }
            } else if (editingItem) {
                // Update existing expense (OpEx)
                res = await updateExpense(editingItem.id, {
                    date: new Date(formDate + "T00:00:00Z"),
                    category: formCategory,
                    amount: Number(formAmount),
                    description: formDescription || undefined,
                    paymentMethod: formPaymentMethod,
                    paymentSource: formPaymentSource || undefined,
                    paymentStatus: formPaymentMethod === "CASH" ? "PAID" : editingItem.paymentStatus,
                    omzetDate: formPaymentMethod === "CASH" && formPaymentSource === "Cash" && formOmzetDate
                        ? new Date(formOmzetDate + "T00:00:00Z")
                        : undefined,
                    dueDate: formPaymentMethod === "PAYLATER" && formDueDate
                        ? new Date(formDueDate + "T00:00:00Z")
                        : undefined,
                    deliveryStatus: formDeliveryStatus,
                });
                if (res.success) {
                    toast.success("Pengeluaran berhasil diperbarui");
                    setIsModalOpen(false);
                    await fetchExpenses();
                } else {
                    toast.error(res.error || "Gagal menyimpan pengeluaran");
                }
            } else {
                // Create new expense (OpEx)
                res = await createExpense({
                    outletId,
                    date: new Date(formDate + "T00:00:00Z"),
                    category: formCategory,
                    amount: Number(formAmount),
                    description: formDescription || undefined,
                    paymentMethod: formPaymentMethod,
                    paymentSource: formPaymentSource || undefined,
                    paymentStatus: formPaymentMethod === "CASH" ? "PAID" : "UNPAID",
                    omzetDate: formPaymentMethod === "CASH" && formPaymentSource === "Cash" && formOmzetDate
                        ? new Date(formOmzetDate + "T00:00:00Z")
                        : undefined,
                    dueDate: formPaymentMethod === "PAYLATER" && formDueDate
                        ? new Date(formDueDate + "T00:00:00Z")
                        : undefined,
                    deliveryStatus: formDeliveryStatus,
                });
                if (res.success) {
                    toast.success("Pengeluaran berhasil dicatat");
                    setIsModalOpen(false);
                    await fetchExpenses();
                } else {
                    toast.error(res.error || "Gagal menyimpan pengeluaran");
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus catatan pengeluaran ini?")) return;
        try {
            const res = await deleteExpense(id);
            if (res.success) {
                toast.success("Pengeluaran berhasil dihapus");
                await fetchExpenses();
            } else {
                toast.error(res.error || "Gagal menghapus");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        }
    };

    const handleMarkPaid = async (id: string) => {
        if (!confirm("Tandai pembayaran sudah lunas?")) return;
        setActionLoadingId(id);
        try {
            const expense = expenses.find((e) => e.id === id);
            if (!expense) return;
            const res = await updateExpense(id, {
                date: new Date(expense.date),
                category: expense.category,
                amount: expense.amount,
                description: expense.description || undefined,
                paymentMethod: expense.paymentMethod,
                paymentSource: expense.paymentSource || undefined,
                paymentStatus: "PAID",
                paidAt: new Date(),
                dueDate: expense.dueDate ? new Date(expense.dueDate) : undefined,
                deliveryStatus: expense.deliveryStatus,
            });
            if (res.success) {
                toast.success("Pembayaran berhasil dicatat lunas");
                await fetchExpenses();
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

    const handleMarkReceived = async (id: string) => {
        if (!confirm("Tandai barang/jasa sudah diterima?")) return;
        setActionLoadingId(id);
        try {
            const expense = expenses.find((e) => e.id === id);
            if (!expense) return;
            const res = await updateExpense(id, {
                date: new Date(expense.date),
                category: expense.category,
                amount: expense.amount,
                description: expense.description || undefined,
                paymentMethod: expense.paymentMethod,
                paymentSource: expense.paymentSource || undefined,
                paymentStatus: expense.paymentStatus,
                dueDate: expense.dueDate ? new Date(expense.dueDate) : undefined,
                deliveryStatus: "RECEIVED",
                receivedAt: new Date(),
            });
            if (res.success) {
                toast.success("Barang/jasa telah diterima");
                await fetchExpenses();
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

    if (loading && !expenses.length) {
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
                    <Plus className="h-4 w-4" /> Catat Kas Keluar
                </Button>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-red-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pengeluaran (OpEx)</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatIDR(totalExpenses)}</div>
                        <p className="text-xs text-muted-foreground">Biaya operasional periode ini</p>
                    </CardContent>
                </Card>
                {Object.entries(expensesByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([cat, amount]) => (
                        <Card key={cat} className="shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label || 
                                     (cat === "STOCK_LOSS" ? "Waste / Stock Loss" : cat)}
                                </CardTitle>
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">{formatIDR(amount)}</div>
                                <p className="text-xs text-muted-foreground">
                                    {totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0}% dari total
                                </p>
                            </CardContent>
                        </Card>
                    ))}
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-950/10 text-blue-800 dark:text-blue-300">
                <ArrowDownUp className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                    <span className="font-semibold">OpEx vs CapEx:</span> Halaman ini menampilkan <strong>Biaya Operasional (OpEx)</strong> saja. 
                    Pembelian aset (CapEx) dapat dicatat lewat tombol &quot;Catat Kas Keluar&quot; dan akan muncul di halaman{" "}
                    <span className="font-semibold">Aset &amp; Balik Modal</span>.
                    Biaya penyusutan aset otomatis masuk ke Laporan Laba Rugi.
                </div>
            </div>

            {/* Table */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                    <CardTitle>Riwayat Pengeluaran Operasional (OpEx)</CardTitle>
                    <CardDescription>Catat biaya operasional, utilitas, gaji karyawan, dan pengeluaran lainnya.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="hidden md:block overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-zinc-900 border-b">
                                    <tr>
                                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Tanggal</th>
                                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Kategori</th>
                                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Keterangan</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Jumlah (Rp)</th>
                                        <th className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">Pembayaran</th>
                                        <th className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">Barang</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {expenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                                Belum ada riwayat pengeluaran. Klik &quot;Catat Kas Keluar&quot; untuk mulai.
                                            </td>
                                        </tr>
                                    ) : (
                                        expenses.map((e) => (
                                            <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                                <td className="p-3 font-medium whitespace-nowrap">
                                                    <div>
                                                        <span>{format(new Date(e.date), "dd MMM yyyy", { locale: idLocale })}</span>
                                                        {e.dueDate && e.paymentStatus !== 'PAID' && (
                                                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                                                                Jatuh tempo: {format(new Date(e.dueDate), "dd MMM yyyy", { locale: idLocale })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${CATEGORY_COLORS[e.category] || CATEGORY_COLORS.OTHER}`}>
                                                        {EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label || 
                                                         (e.category === "STOCK_LOSS" ? "Waste / Stock Loss" : e.category)}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-muted-foreground max-w-[150px] md:max-w-xs truncate" title={e.description || ""}>
                                                    {e.description || "—"}
                                                </td>
                                                <td className="p-3 text-right font-bold text-red-600 whitespace-nowrap">
                                                    {formatIDR(e.amount)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <PaymentStatusBadge status={e.paymentStatus} />
                                                        {e.paymentMethod === 'PAYLATER' && (
                                                            <span className="text-[9px] text-muted-foreground">Paylater</span>
                                                        )}
                                                        {e.paymentSource && (
                                                            <span className="text-[9px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{e.paymentSource}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <DeliveryStatusBadge status={e.deliveryStatus} />
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-1 flex-nowrap">
                                                        {e.deliveryStatus === 'SHIPPING' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleMarkReceived(e.id)}
                                                                disabled={actionLoadingId === e.id}
                                                                className="h-7 text-[10px] px-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
                                                            >
                                                                {actionLoadingId === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                                                Diterima
                                                            </Button>
                                                        )}
                                                        {(e.paymentStatus === 'UNPAID' || e.paymentStatus === 'OVERDUE') && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleMarkPaid(e.id)}
                                                                disabled={actionLoadingId === e.id}
                                                                className="h-7 text-[10px] px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950"
                                                            >
                                                                {actionLoadingId === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CircleDollarSign className="h-3 w-3 mr-1" />}
                                                                Lunas
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="sm" onClick={() => openEditModal(e)} className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900">
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
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

                        {/* Mobile View */}
                        <div className="md:hidden space-y-4">
                            {expenses.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground border rounded-md bg-slate-50 dark:bg-zinc-900/50">
                                    Belum ada riwayat pengeluaran. Klik &quot;Catat Kas Keluar&quot; untuk mulai.
                                </div>
                            ) : (
                                expenses.map((e) => (
                                    <div key={e.id} className="bg-white dark:bg-zinc-950 border rounded-lg p-4 space-y-4 shadow-sm">
                                        <div className="flex justify-between items-start border-b pb-3">
                                            <div className="space-y-1">
                                                <div className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                                                    {formatIDR(e.amount)}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {format(new Date(e.date), "dd MMM yyyy", { locale: idLocale })}
                                                </div>
                                                {e.dueDate && e.paymentStatus !== 'PAID' && (
                                                    <div className="text-xs text-red-500 dark:text-red-400 font-medium">
                                                        Jatuh tempo: {format(new Date(e.dueDate), "dd MMM yyyy", { locale: idLocale })}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium ${CATEGORY_COLORS[e.category] || CATEGORY_COLORS.OTHER}`}>
                                                    {EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label || 
                                                     (e.category === "STOCK_LOSS" ? "Waste / Stock Loss" : e.category)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status Pembayaran</span>
                                                <div className="flex items-center gap-2">
                                                    <PaymentStatusBadge status={e.paymentStatus} />
                                                    {e.paymentMethod === 'PAYLATER' && (
                                                        <span className="text-[10px] text-muted-foreground border px-1.5 py-0.5 rounded-sm">Paylater</span>
                                                    )}
                                                    {e.paymentSource && (
                                                        <span className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm">{e.paymentSource}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 ml-auto">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold text-right">Status Barang</span>
                                                <div className="flex justify-end">
                                                    <DeliveryStatusBadge status={e.deliveryStatus} />
                                                </div>
                                            </div>
                                        </div>

                                        {e.description && (
                                            <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-zinc-900/50 p-2 rounded-md">
                                                <span className="font-medium text-muted-foreground">Keterangan:</span> {e.description}
                                            </div>
                                        )}

                                        <div className="pt-3 border-t flex justify-end gap-2 flex-wrap">
                                            {e.deliveryStatus === 'SHIPPING' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleMarkReceived(e.id)}
                                                    disabled={actionLoadingId === e.id}
                                                    className="h-8 text-xs px-3 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950 flex-1 md:flex-none"
                                                >
                                                    {actionLoadingId === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                                                    Diterima
                                                </Button>
                                            )}
                                            {(e.paymentStatus === 'UNPAID' || e.paymentStatus === 'OVERDUE') && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleMarkPaid(e.id)}
                                                    disabled={actionLoadingId === e.id}
                                                    className="h-8 text-xs px-3 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950 flex-1 md:flex-none"
                                                >
                                                    {actionLoadingId === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <CircleDollarSign className="h-3.5 w-3.5 mr-1.5" />}
                                                    Lunas
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => openEditModal(e)} className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 border md:border-none">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 border md:border-none">
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Unified Kas Keluar Modal */}
            <Modal
                title={editingItem ? "Edit Pengeluaran" : "Catat Kas Keluar"}
                description={editingItem ? "Perbarui data pengeluaran operasional." : "Pilih jenis pengeluaran: Biaya Operasional (OpEx) atau Pembelian Aset (CapEx)."}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            >
                {/* Segmented Control — only for new entries */}
                {!editingItem && (
                    <div className="flex rounded-lg border bg-slate-100 dark:bg-zinc-900 p-1 mb-4">
                        <button
                            type="button"
                            onClick={() => setEntryType("OPEX")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                                entryType === "OPEX"
                                    ? "bg-white dark:bg-zinc-800 shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Receipt className="h-4 w-4" />
                            Biaya Operasional
                        </button>
                        <button
                            type="button"
                            onClick={() => setEntryType("CAPEX")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                                entryType === "CAPEX"
                                    ? "bg-white dark:bg-zinc-800 shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Wallet className="h-4 w-4" />
                            Pembelian Aset
                        </button>
                    </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
                    {/* OpEx Form */}
                    {(entryType === "OPEX" || editingItem) && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Tanggal *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formDate}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFormDate(val);
                                            if (formPaymentMethod === "PAYLATER" && val) {
                                                setFormDueDate(calculatePaylaterDueDate(val));
                                            }
                                        }}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Kategori *</label>
                                    <select
                                        required
                                        value={formCategory}
                                        onChange={(e) => setFormCategory(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        {EXPENSE_CATEGORIES.map((c) => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Jumlah (Rp) *</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    placeholder="Contoh: 500000"
                                    value={formAmount}
                                    onChange={(e) => setFormAmount(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Keterangan (Opsional)</label>
                                <textarea
                                    placeholder="Misal: Bayar listrik bulanan"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    rows={2}
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>

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
                                            onClick={() => {
                                                setFormPaymentMethod("PAYLATER");
                                                if (formDate) {
                                                    setFormDueDate(calculatePaylaterDueDate(formDate));
                                                }
                                            }}
                                            className={`flex-1 h-9 rounded-md border text-xs font-medium transition-all ${
                                                formPaymentMethod === "PAYLATER"
                                                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 shadow-sm"
                                                    : "bg-transparent border-input text-muted-foreground hover:bg-accent"
                                            }`}
                                        >
                                            🏷️ Paylater / Hutang
                                        </button>
                                    </div>
                                    <div className="space-y-1 pt-1">
                                        <label className="text-xs font-medium">Nama Layanan (Bank/Cash)</label>
                                        <select
                                            value={formPaymentSource}
                                            onChange={(e) => setFormPaymentSource(e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        >
                                            {PAYMENT_SOURCE_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {formPaymentMethod === "CASH" && formPaymentSource === "Cash" && (
                                        <div className="space-y-1 pt-1">
                                            <label className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Tanggal Ambil Omzet (Opsional)</label>
                                            <input
                                                type="date"
                                                value={formOmzetDate}
                                                onChange={(e) => setFormOmzetDate(e.target.value)}
                                                className="flex h-9 w-full rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                                            />
                                            <p className="text-[10px] text-muted-foreground leading-tight">Ubah tanggal ini jika uang belanja diambil dari hari lain.</p>
                                        </div>
                                    )}
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
                                            <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight">
                                                💡 Otomatis dipilih berdasarkan siklus PayLater. Anda tetap dapat mengubahnya.
                                            </p>
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
                                            <span>Barang/jasa belum diterima. Anda dapat mengubah status nanti.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* CapEx Form */}
                    {entryType === "CAPEX" && !editingItem && (
                        <>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Nama Aset *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Mesin Espresso, Grinder, Kulkas"
                                    value={formAssetName}
                                    onChange={(e) => setFormAssetName(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Tanggal Beli *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formAssetDate}
                                        onChange={(e) => setFormAssetDate(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Harga Beli (Rp) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder="10000000"
                                        value={formAssetPrice}
                                        onChange={(e) => setFormAssetPrice(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Masa Manfaat (Penyusutan) *</label>
                                <select
                                    required
                                    value={formUsefulLife}
                                    onChange={(e) => setFormUsefulLife(Number(e.target.value))}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    {USEFUL_LIFE_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                                {formAssetPrice && formUsefulLife > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Penyusutan/bulan: <strong>{formatIDR(Number(formAssetPrice) / formUsefulLife)}</strong>
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Catatan (Opsional)</label>
                                <textarea
                                    placeholder="Misal: Mesin espresso Breville 2-head"
                                    value={formAssetNotes}
                                    onChange={(e) => setFormAssetNotes(e.target.value)}
                                    rows={2}
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>

                            {/* CapEx info */}
                            <div className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                                <span className="font-semibold">ℹ️ Pembelian aset (CapEx)</span> tidak akan memotong Laba Bersih bulan ini secara utuh. 
                                Sistemakan otomatis menyusutkan nilainya selama masa manfaat ke Laporan Laba Rugi.
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={formSubmitting}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={formSubmitting}>
                            {formSubmitting ? "Menyimpan..." : entryType === "CAPEX" && !editingItem ? "Simpan Aset" : "Simpan"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
