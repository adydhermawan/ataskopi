"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getBalanceSheet } from "@/actions/reports";
import {
    Loader2,
    Calendar,
    Coins,
    Briefcase,
    TrendingUp,
    Package,
    Gem,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface BalanceSheetData {
    asOfDate: Date;
    cash: number;
    qrisBalance: number;
    otherBalance: number;
    inventory: {
        details: Array<{
            id: string;
            name: string;
            unit: string;
            currentStock: number;
            averageCost: number;
            totalValue: number;
        }>;
        totalValue: number;
    };
    inTransitInventory: {
        totalValue: number;
        count: number;
    };
    fixedAssets: {
        details: Array<{
            id: string;
            name: string;
            purchasePrice: number;
            purchaseDate: Date;
            usefulLifeMonths: number;
            monthlyDepreciation: number;
            accumulatedDepreciation: number;
            bookValue: number;
        }>;
        totalValue: number;
        costValue: number;
        totalAccumulatedDepreciation: number;
    };
    totalAssets: number;
    accountsPayable: number;
    accountsPayableCount: number;
    equity: {
        initialCapital: number;
        retainedEarnings: number;
        totalPurchases: number;
    };
}

export function BalanceSheetClient() {
    const { user } = useCurrentUser();
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [outletId, setOutletId] = useState<string | null>(null);
    const [asOfDate, setAsOfDate] = useState<string>(new Date().toLocaleDateString("en-CA"));
    const [data, setData] = useState<BalanceSheetData | null>(null);

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

    const fetchBalanceSheet = async () => {
        if (!outletId) return;
        setLoading(true);
        try {
            const res = await getBalanceSheet(outletId, new Date(asOfDate + "T23:59:59Z"));
            setData({
                ...res,
                asOfDate: new Date(res.asOfDate),
                fixedAssets: {
                    ...res.fixedAssets,
                    details: res.fixedAssets.details.map((d) => ({
                        ...d,
                        purchaseDate: new Date(d.purchaseDate),
                    })),
                },
            } as BalanceSheetData);
        } catch (err) {
            console.error("Failed to fetch balance sheet:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && outletId) fetchBalanceSheet();
    }, [user, outletId, asOfDate]);

    const formatIDR = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    if (loading && !data) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const totalEquity = (data?.equity.initialCapital || 0) + (data?.equity.retainedEarnings || 0);
    const totalLiabilities = data?.accountsPayable || 0;
    const totalPasiva = totalLiabilities + totalEquity;

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
                        <span className="text-sm font-medium text-muted-foreground">Per Tanggal:</span>
                        <input
                            type="date"
                            value={asOfDate}
                            onChange={(e) => setAsOfDate(e.target.value)}
                            className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Posisi Laporan: <strong>{format(new Date(asOfDate), "dd MMMM yyyy", { locale: idLocale })}</strong>
                </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Aset (Aktiva)</CardTitle>
                        <Coins className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {formatIDR(data?.totalAssets || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Kas + Persediaan + Aset Tetap Net</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Laba Ditahan (Akumulasi)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${(data?.equity.retainedEarnings || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {formatIDR(data?.equity.retainedEarnings || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Total laba bersih sejak awal</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pasiva & Ekuitas</CardTitle>
                        <Briefcase className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-600">
                            {formatIDR(totalPasiva)}
                        </div>
                        <p className="text-xs text-muted-foreground">Hutang + Modal + Laba</p>
                    </CardContent>
                </Card>
            </div>

            {/* Two-Column Balance Sheet Details */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* ASET COLUMN */}
                <Card className="shadow-sm border">
                    <CardHeader className="bg-slate-50 dark:bg-zinc-900 border-b">
                        <CardTitle className="flex justify-between items-center text-lg">
                            <span>ASET (AKTIVA)</span>
                            <span className="text-blue-600 font-bold">{formatIDR(data?.totalAssets || 0)}</span>
                        </CardTitle>
                        <CardDescription>Aset Lancar dan Aset Tetap milik outlet</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        {/* Aset Lancar */}
                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-1 flex justify-between items-center text-sm">
                                <span className="flex items-center gap-1.5">
                                    <Coins className="h-4 w-4 text-blue-500" />
                                    Aset Lancar
                                </span>
                                <span>{formatIDR((data?.cash || 0) + (data?.qrisBalance || 0) + (data?.otherBalance || 0) + (data?.inventory.totalValue || 0))}</span>
                            </h4>
                            <div className="space-y-2 pl-2">
                                <div className="flex justify-between items-center text-xs py-1 border-b border-dashed">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">Kas Fisik</span>
                                    <span className="font-semibold text-emerald-600">{formatIDR(data?.cash || 0)}</span>
                                </div>
                                {(data?.qrisBalance || 0) > 0 && (
                                    <div className="flex justify-between items-center text-xs py-1 border-b border-dashed">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Saldo QRIS</span>
                                        <span className="font-semibold text-blue-600">{formatIDR(data?.qrisBalance || 0)}</span>
                                    </div>
                                )}
                                {(data?.otherBalance || 0) > 0 && (
                                    <div className="flex justify-between items-center text-xs py-1 border-b border-dashed">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Saldo Lainnya (Transfer, dll)</span>
                                        <span className="font-semibold text-blue-600">{formatIDR(data?.otherBalance || 0)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xs py-1 border-b border-dashed">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">Persediaan Bahan Baku (Data Stok Opname)</span>
                                    <span className="font-semibold">{formatIDR(data?.inventory.totalValue || 0)}</span>
                                </div>
                                {(data?.inTransitInventory.totalValue || 0) > 0 && (
                                    <div className="flex justify-between items-center text-xs py-1 border-b border-dashed">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            Persediaan Dalam Perjalanan
                                            <span className="text-[9px] text-muted-foreground block">({data?.inTransitInventory.count || 0} pembelian belum diterima)</span>
                                        </span>
                                        <span className="font-semibold text-blue-600">{formatIDR(data?.inTransitInventory.totalValue || 0)}</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Materials Details list */}
                            <div className="pl-4 pt-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Detail Persediaan:</span>
                                <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-1 mt-1 border-l-2 pl-2">
                                    {data?.inventory.details.length === 0 ? (
                                        <div className="text-[10px] text-muted-foreground py-1">Tidak ada persediaan bahan baku.</div>
                                    ) : (
                                        data?.inventory.details.map((m) => (
                                            <div key={m.id} className="flex justify-between items-center text-[11px] py-0.5 border-b border-dashed border-slate-100 dark:border-zinc-800">
                                                <div>
                                                    <span className="text-slate-600 dark:text-slate-400">{m.name}</span>
                                                    <span className="text-[9px] text-muted-foreground block">
                                                        {m.currentStock} {m.unit} × {formatIDR(m.averageCost)}
                                                    </span>
                                                </div>
                                                <span className="font-medium">{formatIDR(m.totalValue)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Aset Tetap */}
                        <div className="space-y-3 pt-2">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-1 flex justify-between items-center text-sm">
                                <span className="flex items-center gap-1.5">
                                    <Gem className="h-4 w-4 text-indigo-500" />
                                    Aset Tetap
                                </span>
                                <span>{formatIDR(data?.fixedAssets.totalValue || 0)}</span>
                            </h4>
                            <div className="space-y-2 pl-2">
                                <div className="flex justify-between items-center text-xs py-1 border-b border-dashed">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">Peralatan & Inventaris (Harga Perolehan)</span>
                                    <span className="font-semibold">{formatIDR(data?.fixedAssets.costValue || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs py-1 border-b border-dashed">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">Akumulasi Penyusutan Aset (-)</span>
                                    <span className="font-semibold text-red-600">({formatIDR(data?.fixedAssets.totalAccumulatedDepreciation || 0)})</span>
                                </div>
                            </div>

                            {/* Fixed Assets details list */}
                            <div className="pl-4 pt-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Detail Aset:</span>
                                <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1 mt-1 border-l-2 pl-2">
                                    {data?.fixedAssets.details.length === 0 ? (
                                        <div className="text-[10px] text-muted-foreground py-1">Tidak ada aset tetap terdaftar.</div>
                                    ) : (
                                        data?.fixedAssets.details.map((a) => (
                                            <div key={a.id} className="py-1 border-b border-dashed border-slate-100 dark:border-zinc-800 text-[11px] space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">{a.name}</span>
                                                        <span className="text-[9px] text-muted-foreground block">
                                                            Beli: {format(a.purchaseDate, "dd MMM yyyy", { locale: idLocale })} ({a.usefulLifeMonths} Bln)
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-semibold text-emerald-600 block">{formatIDR(a.bookValue)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between text-[9px] text-muted-foreground bg-slate-50 dark:bg-zinc-900/50 p-1 rounded">
                                                    <span>Harga Perolehan: {formatIDR(a.purchasePrice)}</span>
                                                    <span>Penyusutan: {formatIDR(a.accumulatedDepreciation)}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* EKUITAS COLUMN */}
                <Card className="shadow-sm border">
                    <CardHeader className="bg-slate-50 dark:bg-zinc-900 border-b">
                        <CardTitle className="flex justify-between items-center text-lg">
                            <span>PASIVA & EKUITAS</span>
                            <span className="text-indigo-600 font-bold">{formatIDR(totalPasiva)}</span>
                        </CardTitle>
                        <CardDescription>Liabilitas dan Ekuitas milik outlet</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        {/* Liabilitas */}
                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-1 flex items-center gap-1.5 text-sm">
                                <Coins className="h-4 w-4 text-slate-500" />
                                Liabilitas
                            </h4>
                            <div className="space-y-2 pl-2">
                                <div className="flex justify-between items-center text-xs py-1 border-b border-dashed">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                        Utang Dagang (Pembelian Paylater)
                                        {(data?.accountsPayableCount || 0) > 0 && (
                                            <span className="text-[9px] text-muted-foreground block">({data?.accountsPayableCount} tagihan belum lunas)</span>
                                        )}
                                    </span>
                                    <span className={`font-semibold ${(data?.accountsPayable || 0) > 0 ? 'text-red-600' : ''}`}>
                                        {formatIDR(data?.accountsPayable || 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold bg-slate-50 dark:bg-zinc-900/60 p-2 rounded border mt-2">
                                    <span className="text-xs">TOTAL LIABILITAS</span>
                                    <span className={`${totalLiabilities > 0 ? 'text-red-600' : ''}`}>{formatIDR(totalLiabilities)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Ekuitas Pemilik */}
                        <div className="space-y-3 pt-2">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-1 flex items-center gap-1.5 text-sm">
                                <Briefcase className="h-4 w-4 text-indigo-500" />
                                Ekuitas Pemilik
                            </h4>
                            
                            <div className="space-y-3 pl-2">
                                <div className="flex justify-between items-center text-xs py-1.5 border-b">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">Modal Awal Toko (Dinamis / User Input)</span>
                                    <span className="font-semibold">{formatIDR(data?.equity.initialCapital || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs py-1.5 border-b">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">Laba Ditahan (Akumulasi Profit Bersih)</span>
                                    <span className={`font-semibold ${(data?.equity.retainedEarnings || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                        {formatIDR(data?.equity.retainedEarnings || 0)}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-sm font-bold bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-lg border mt-4">
                                    <span>TOTAL EKUITAS</span>
                                    <span className="text-indigo-600">{formatIDR(totalEquity)}</span>
                                </div>

                                <div className="flex justify-between items-center text-sm font-bold bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 mt-3">
                                    <span className="text-indigo-700 dark:text-indigo-400">TOTAL PASIVA + EKUITAS</span>
                                    <span className="text-indigo-600">{formatIDR(totalPasiva)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Balance sheet notes */}
                        <div className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/10 p-3 text-[11px] text-amber-800 dark:text-amber-300 space-y-1.5">
                            <span className="font-bold uppercase block text-amber-900 dark:text-amber-400">Catatan Akuntansi Neraca:</span>
                            <p>
                                1. Nilai persediaan bahan baku dihitung berdasarkan data stok aktual dikalikan dengan harga modal rata-rata (Moving Average Cost) hasil pencatatan pembelian.
                            </p>
                            <p>
                                2. Laba ditahan diperoleh dari total akumulasi omset real dikurangi COGS stock opname, biaya operasional (OpEx), dan biaya penyusutan aset tetap (Depresiasi).
                            </p>
                            <p>
                                3. Aset Tetap disajikan sebesar Nilai Buku (Harga Perolehan dikurangi Akumulasi Penyusutan). Penyusutan dihitung secara berkala berdasarkan masa manfaat masing-masing aset.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
