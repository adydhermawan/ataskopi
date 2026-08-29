"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import {
    getUnpaidDebts,
    getDebtSummary,
    batchPayDebts,
    type UnpaidDebtItem,
} from "@/actions/debt-payment";
import {
    Loader2,
    CreditCard,
    AlertTriangle,
    Clock,
    ShoppingCart,
    Receipt,
    CircleDollarSign,
    CheckCircle2,
    Banknote,
    Search,
    Filter,
    X,
    Gem,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

const PAYMENT_SOURCE_OPTIONS = [
    { value: "", label: "— Pilih Sumber Dana —" },
    { value: "Cash", label: "Cash (Uang Fisik)" },
    { value: "Jago Atas Kopi", label: "Jago Atas Kopi" },
    { value: "Jago Ady", label: "Jago Ady" },
    { value: "Mandiri", label: "Mandiri" },
    { value: "Denik", label: "Denik" },
];

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
    OPERATIONAL: "Operasional",
    SALARY: "Gaji Karyawan",
    UTILITY: "Utilitas",
    RENT: "Sewa Tempat",
    STOCK_LOSS: "Waste / Stock Loss",
    OTHER: "Lain-lain",
    PEMBELIAN: "Pembelian Bahan Baku",
    CAPEX: "Pembelian Aset (CapEx)",
};

interface DebtSummaryData {
    totalDebt: number;
    totalCount: number;
    purchaseTotal: number;
    purchaseCount: number;
    expenseTotal: number;
    expenseCount: number;
    assetTotal: number;
    assetCount: number;
    overdueTotal: number;
    overdueCount: number;
}

export function DebtPaymentClient() {
    const { user } = useCurrentUser();
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [outletId, setOutletId] = useState<string | null>(null);

    const [debts, setDebts] = useState<UnpaidDebtItem[]>([]);
    const [summary, setSummary] = useState<DebtSummaryData | null>(null);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [paying, setPaying] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [paymentSource, setPaymentSource] = useState("");

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"ALL" | "purchase" | "expense" | "asset">("ALL");
    const [filterStatus, setFilterStatus] = useState<"ALL" | "UNPAID" | "OVERDUE">("ALL");
    const [filterSource, setFilterSource] = useState<string>("ALL");

    // Outlet setup
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

    // Fetch debts
    const fetchDebts = async () => {
        if (!outletId) return;
        setLoading(true);
        try {
            const [debtsData, summaryData] = await Promise.all([
                getUnpaidDebts(outletId),
                getDebtSummary(outletId),
            ]);
            setDebts(debtsData);
            setSummary(summaryData);
            setSelectedIds(new Set()); // Reset selection on refresh
        } catch (err) {
            console.error("Failed to fetch debts:", err);
            toast.error("Gagal memuat data hutang");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && outletId) fetchDebts();
    }, [user, outletId]);

    // Filtered debts
    const filteredDebts = useMemo(() => {
        return debts.filter((d) => {
            if (filterType !== "ALL" && d.type !== filterType) return false;
            if (filterStatus !== "ALL" && d.paymentStatus !== filterStatus) return false;
            if (filterSource !== "ALL" && (d.paymentSource || "—") !== filterSource) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchDesc = d.description?.toLowerCase().includes(q);
                const matchSupplier = d.supplier?.toLowerCase().includes(q);
                const matchMaterial = d.rawMaterialName?.toLowerCase().includes(q);
                const matchCategory = (EXPENSE_CATEGORY_LABELS[d.category] || d.category).toLowerCase().includes(q);
                if (!matchDesc && !matchSupplier && !matchMaterial && !matchCategory) return false;
            }
            return true;
        });
    }, [debts, filterType, filterStatus, filterSource, searchQuery]);

    // Unique payment sources for filter
    const uniqueSources = useMemo(() => {
        const sources = new Set<string>();
        debts.forEach((d) => sources.add(d.paymentSource || "—"));
        return Array.from(sources).sort();
    }, [debts]);

    // Selection helpers
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredDebts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredDebts.map((d) => d.id)));
        }
    };

    const selectedDebts = debts.filter((d) => selectedIds.has(d.id));
    const selectedTotal = selectedDebts.reduce((sum, d) => sum + d.amount, 0);
    const isAllSelected = filteredDebts.length > 0 && selectedIds.size === filteredDebts.length;

    // Payment handler
    const handleBatchPay = async () => {
        if (selectedDebts.length === 0) return;
        setPaying(true);
        try {
            const purchaseIds = selectedDebts.filter((d) => d.type === "purchase").map((d) => d.id);
            const expenseIds = selectedDebts.filter((d) => d.type === "expense").map((d) => d.id);
            const assetIds = selectedDebts.filter((d) => d.type === "asset").map((d) => d.id);

            const res = await batchPayDebts(
                purchaseIds,
                expenseIds,
                assetIds,
                paymentSource || undefined,
            );

            if (res.success) {
                toast.success(res.message || "Pembayaran berhasil!");
                setShowConfirmModal(false);
                setPaymentSource("");
                await fetchDebts();
            } else {
                toast.error(res.error || "Gagal memproses pembayaran");
            }
        } catch (err) {
            console.error("Batch pay error:", err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setPaying(false);
        }
    };

    const clearFilters = () => {
        setSearchQuery("");
        setFilterType("ALL");
        setFilterStatus("ALL");
        setFilterSource("ALL");
    };

    const hasActiveFilters = searchQuery || filterType !== "ALL" || filterStatus !== "ALL" || filterSource !== "ALL";

    if (loading && debts.length === 0) {
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
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Pembayaran Hutang (Paylater)
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
                <Card className="border-l-4 border-l-red-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Total Hutang</CardTitle>
                        <Banknote className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold text-red-600">
                            {formatCurrency(summary?.totalDebt || 0)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            {summary?.totalCount || 0} tagihan belum lunas
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Jatuh Tempo</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold text-orange-600">
                            {formatCurrency(summary?.overdueTotal || 0)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            {summary?.overdueCount || 0} tagihan overdue
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Hutang Pembelian</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold text-blue-600">
                            {formatCurrency(summary?.purchaseTotal || 0)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            {summary?.purchaseCount || 0} pembelian
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Hutang Pengeluaran</CardTitle>
                        <Receipt className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold text-purple-600">
                            {formatCurrency(summary?.expenseTotal || 0)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            {summary?.expenseCount || 0} operasional
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500 shadow-sm col-span-2 md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium">Hutang Aset</CardTitle>
                        <Gem className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold text-indigo-600">
                            {formatCurrency(summary?.assetTotal || 0)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            {summary?.assetCount || 0} aset tetap
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="shadow-sm">
                <CardContent className="pt-4 pb-3">
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                        <div className="relative flex-1 w-full md:max-w-xs">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Cari deskripsi, supplier, aset..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Filter className="h-4 w-4 text-muted-foreground hidden md:block" />
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="h-9 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="ALL">Semua Tipe</option>
                                <option value="purchase">Pembelian Bahan Baku</option>
                                <option value="expense">Biaya Operasional (OpEx)</option>
                                <option value="asset">Pembelian Aset (CapEx)</option>
                            </select>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="h-9 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="ALL">Semua Status</option>
                                <option value="UNPAID">Belum Bayar</option>
                                <option value="OVERDUE">Jatuh Tempo</option>
                            </select>
                            {uniqueSources.length > 1 && (
                                <select
                                    value={filterSource}
                                    onChange={(e) => setFilterSource(e.target.value)}
                                    className="h-9 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="ALL">Semua Sumber</option>
                                    {uniqueSources.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            )}
                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-muted-foreground">
                                    <X className="h-3 w-3 mr-1" /> Reset
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Debt Table */}
            <Card className="shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Daftar Hutang Belum Lunas</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                            Centang transaksi yang ingin dibayar, lalu klik &quot;Bayar Sekarang&quot;
                        </p>
                    </div>
                    {filteredDebts.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleSelectAll}
                            className="h-8 text-xs"
                        >
                            {isAllSelected ? "Batal Pilih Semua" : "Pilih Semua"}
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50 dark:bg-zinc-900/50">
                                    <th className="p-3 w-10 text-center">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={toggleSelectAll}
                                            aria-label="Select all"
                                        />
                                    </th>
                                    <th className="p-3 text-left font-medium text-muted-foreground text-xs">Tanggal</th>
                                    <th className="p-3 text-left font-medium text-muted-foreground text-xs">Tipe</th>
                                    <th className="p-3 text-left font-medium text-muted-foreground text-xs">Deskripsi</th>
                                    <th className="p-3 text-left font-medium text-muted-foreground text-xs">Supplier / Kategori</th>
                                    <th className="p-3 text-center font-medium text-muted-foreground text-xs">Sumber</th>
                                    <th className="p-3 text-center font-medium text-muted-foreground text-xs">Status</th>
                                    <th className="p-3 text-center font-medium text-muted-foreground text-xs">Jatuh Tempo</th>
                                    <th className="p-3 text-right font-medium text-muted-foreground text-xs">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDebts.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <CheckCircle2 className="h-10 w-10 text-emerald-300" />
                                                <span className="text-base font-medium">Tidak ada hutang! 🎉</span>
                                                <span className="text-xs">Semua tagihan sudah lunas.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDebts.map((debt) => {
                                        const isSelected = selectedIds.has(debt.id);
                                        const isOverdue = debt.paymentStatus === "OVERDUE";
                                        return (
                                            <tr
                                                key={debt.id}
                                                onClick={() => toggleSelect(debt.id)}
                                                className={`border-b transition-colors cursor-pointer ${
                                                    isSelected
                                                        ? "bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30"
                                                        : isOverdue
                                                        ? "bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                        : "hover:bg-slate-50 dark:hover:bg-zinc-900/50"
                                                }`}
                                            >
                                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSelect(debt.id)}
                                                    />
                                                </td>
                                                <td className="p-3 whitespace-nowrap text-xs">
                                                    {format(new Date(debt.date), "dd MMM yyyy", { locale: idLocale })}
                                                </td>
                                                <td className="p-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                                                        debt.type === "purchase"
                                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                                            : debt.type === "asset"
                                                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                                                            : "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                                                    }`}>
                                                        {debt.type === "purchase" ? (
                                                            <><ShoppingCart className="h-3 w-3" /> Pembelian</>
                                                        ) : debt.type === "asset" ? (
                                                            <><Gem className="h-3 w-3" /> Aset</>
                                                        ) : (
                                                            <><Receipt className="h-3 w-3" /> Operasional</>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="p-3 max-w-[200px]">
                                                    <div className="truncate text-xs font-medium" title={debt.description}>
                                                        {debt.description}
                                                    </div>
                                                    {debt.rawMaterialName && debt.description !== `Pembelian ${debt.rawMaterialName}` && (
                                                        <div className="text-[10px] text-muted-foreground">{debt.rawMaterialName}</div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-xs">
                                                    {debt.type === "purchase"
                                                        ? debt.supplier || "—"
                                                        : debt.type === "asset"
                                                        ? "Aset Tetap (CapEx)"
                                                        : EXPENSE_CATEGORY_LABELS[debt.category] || debt.category
                                                    }
                                                </td>
                                                <td className="p-3 text-center">
                                                    {debt.paymentSource ? (
                                                        <span className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                            {debt.paymentSource}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {isOverdue ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400">
                                                            <AlertTriangle className="h-3 w-3" /> Jatuh Tempo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                                                            <Clock className="h-3 w-3" /> Belum Bayar
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center text-xs whitespace-nowrap">
                                                    {debt.dueDate ? (
                                                        <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                                                            {format(new Date(debt.dueDate), "dd MMM yyyy", { locale: idLocale })}
                                                        </span>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>
                                                <td className="p-3 text-right font-bold text-red-600 whitespace-nowrap">
                                                    {formatCurrency(debt.amount)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {filteredDebts.length > 0 && (
                                <tfoot>
                                    <tr className="bg-slate-50 dark:bg-zinc-900/50 border-t-2">
                                        <td colSpan={8} className="p-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">
                                            Total Semua Hutang
                                        </td>
                                        <td className="p-3 text-right text-base font-bold text-red-600">
                                            {formatCurrency(filteredDebts.reduce((sum, d) => sum + d.amount, 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden p-4 space-y-3">
                        {filteredDebts.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground border rounded-md bg-slate-50 dark:bg-zinc-900/50">
                                <CheckCircle2 className="h-10 w-10 text-emerald-300 mx-auto mb-2" />
                                <span className="text-base font-medium block">Tidak ada hutang! 🎉</span>
                                <span className="text-xs">Semua tagihan sudah lunas.</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-center pb-2">
                                    <span className="text-xs text-muted-foreground">{filteredDebts.length} tagihan</span>
                                    <Button variant="outline" size="sm" onClick={toggleSelectAll} className="h-7 text-[10px]">
                                        {isAllSelected ? "Batal Pilih Semua" : "Pilih Semua"}
                                    </Button>
                                </div>
                                {filteredDebts.map((debt) => {
                                    const isSelected = selectedIds.has(debt.id);
                                    const isOverdue = debt.paymentStatus === "OVERDUE";
                                    return (
                                        <div
                                            key={debt.id}
                                            onClick={() => toggleSelect(debt.id)}
                                            className={`rounded-lg border p-4 space-y-3 transition-colors cursor-pointer ${
                                                isSelected
                                                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-200 dark:ring-emerald-800"
                                                    : isOverdue
                                                    ? "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900"
                                                    : "bg-white dark:bg-zinc-950"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSelect(debt.id)}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-sm truncate">{debt.description}</div>
                                                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                                                {format(new Date(debt.date), "dd MMM yyyy", { locale: idLocale })}
                                                                {debt.supplier && ` • ${debt.supplier}`}
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="font-bold text-red-600 text-sm">
                                                                {formatCurrency(debt.amount)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                                            debt.type === "purchase"
                                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                                                : debt.type === "asset"
                                                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                                                                : "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                                                        }`}>
                                                            {debt.type === "purchase" ? "Pembelian" : debt.type === "asset" ? "Aset" : "Operasional"}
                                                        </span>
                                                        {isOverdue ? (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-100 text-red-700">
                                                                <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700">
                                                                <Clock className="h-2.5 w-2.5" /> Belum Bayar
                                                            </span>
                                                        )}
                                                        {debt.paymentSource && (
                                                            <span className="text-[9px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                                {debt.paymentSource}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {debt.dueDate && (
                                                        <div className={`text-[10px] mt-1.5 ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                                                            Jatuh tempo: {format(new Date(debt.dueDate), "dd MMM yyyy", { locale: idLocale })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Floating Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:pl-[calc(18rem+1rem)]">
                    <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl shadow-2xl shadow-emerald-100/50 dark:shadow-emerald-900/30 p-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                    <CircleDollarSign className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium">
                                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">{selectedIds.size}</span>
                                        {" "}tagihan dipilih
                                    </div>
                                    <div className="text-lg font-bold text-red-600">
                                        {formatCurrency(selectedTotal)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedIds(new Set())}
                                    className="h-9"
                                >
                                    Batal
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setShowConfirmModal(true)}
                                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white px-6 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50"
                                >
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Bayar Sekarang
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Spacer when floating bar is visible */}
            {selectedIds.size > 0 && <div className="h-24" />}

            {/* Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => {
                    if (!paying) {
                        setShowConfirmModal(false);
                        setPaymentSource("");
                    }
                }}
                title="Konfirmasi Pembayaran Hutang"
                description={`Anda akan melunasi ${selectedIds.size} tagihan senilai ${formatCurrency(selectedTotal)}`}
            >
                <div className="space-y-5 py-2">
                    {/* Payment summary */}
                    <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-lg p-4 space-y-3">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ringkasan Pembayaran</div>
                        <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                            {selectedDebts.map((debt) => (
                                <div key={debt.id} className="flex justify-between items-center text-sm py-1.5 border-b border-dashed">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        {debt.type === "purchase" ? (
                                            <ShoppingCart className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                        ) : debt.type === "asset" ? (
                                            <Gem className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                        ) : (
                                            <Receipt className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                        )}
                                        <span className="truncate text-xs">{debt.description}</span>
                                    </div>
                                    <span className="font-medium text-red-600 ml-3 whitespace-nowrap text-xs">
                                        {formatCurrency(debt.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t-2 font-bold">
                            <span>Total</span>
                            <span className="text-red-600 text-lg">{formatCurrency(selectedTotal)}</span>
                        </div>
                    </div>

                    {/* Payment source selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Sumber Dana Pembayaran</label>
                        <select
                            value={paymentSource}
                            onChange={(e) => setPaymentSource(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            {PAYMENT_SOURCE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-muted-foreground">
                            Pilih dari rekening mana uang diambil untuk pembayaran. Saldo rekening di neraca akan berkurang otomatis.
                        </p>
                    </div>

                    {/* Warning */}
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Perhatian:</span> Setelah dibayar, status transaksi akan berubah menjadi &quot;LUNAS&quot;.
                            Saldo kas di Neraca akan berkurang dan Arus Kas akan terupdate otomatis.
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowConfirmModal(false);
                                setPaymentSource("");
                            }}
                            disabled={paying}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleBatchPay}
                            disabled={paying}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                        >
                            {paying ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Bayar {formatCurrency(selectedTotal)}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
