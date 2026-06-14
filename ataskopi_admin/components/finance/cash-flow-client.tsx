"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getCashFlowReport, getMonthlyCashFlowTrend } from "@/actions/cash-flow";
import {
    Loader2,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Coins,
    TrendingUp,
    ShoppingBag,
    Briefcase,
    Wrench,
    Info,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface CashFlowReportData {
    cashIn: {
        revenue: number;
    };
    cashOut: {
        purchases: number;
        opex: number;
        capex: number;
        totalCashOut: number;
    };
    netCashFlow: number;
    opexByCategory: Record<string, number>;
    capexDetails: Array<{
        id: string;
        name: string;
        purchaseDate: Date;
        amount: number;
    }>;
}

interface MonthlyTrendData {
    month: string;
    cashIn: number;
    purchases: number;
    opex: number;
    capex: number;
    totalCashOut: number;
    netCashFlow: number;
}

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
    OPERATIONAL: "Operasional",
    SALARY: "Gaji",
    UTILITY: "Utilitas (Listrik/Air/Gas)",
    RENT: "Sewa Tempat",
    STOCK_LOSS: "Waste/Loss",
    DEPRECIATION: "Penyusutan Aset",
    OTHER: "Lain-lain",
};

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#ec4899"]; // Blue for COGS, Amber for OpEx, Pink for CapEx

const TREND_PERIODS = [
    { value: "3", label: "3 Bulan" },
    { value: "6", label: "6 Bulan" },
    { value: "12", label: "12 Bulan" },
];

export function CashFlowClient() {
    const { user } = useCurrentUser();
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [outletId, setOutletId] = useState<string | null>(null);

    // Filter states
    const now = new Date();
    const [startDate, setStartDate] = useState<string>(format(startOfMonth(now), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState<string>(format(endOfMonth(now), "yyyy-MM-dd"));
    const [trendPeriod, setTrendPeriod] = useState<string>("6");

    // Data states
    const [reportData, setReportData] = useState<CashFlowReportData | null>(null);
    const [trendData, setTrendData] = useState<Array<MonthlyTrendData>>([]);

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

    const fetchData = async () => {
        if (!outletId) return;
        setLoading(true);
        try {
            const start = new Date(startDate + "T00:00:00Z");
            const end = new Date(endDate + "T23:59:59Z");

            const [report, trend] = await Promise.all([
                getCashFlowReport(outletId, start, end),
                getMonthlyCashFlowTrend(outletId, Number(trendPeriod)),
            ]);

            setReportData({
                ...report,
                capexDetails: report.capexDetails.map((c) => ({
                    ...c,
                    purchaseDate: new Date(c.purchaseDate),
                })),
            });
            setTrendData(trend);
        } catch (err) {
            console.error("Failed to fetch cash flow data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && outletId) {
            fetchData();
        }
    }, [user, outletId, startDate, endDate, trendPeriod]);

    const formatIDR = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    const formatIDRShort = (val: number) => {
        if (Math.abs(val) >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}jt`;
        if (Math.abs(val) >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}rb`;
        return `Rp ${val}`;
    };

    if (loading && !reportData) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Pie chart calculations
    const pieData = reportData
        ? [
              { name: "Pembelian Bahan Baku (COGS)", value: reportData.cashOut.purchases },
              { name: "Biaya Operasional (OpEx)", value: reportData.cashOut.opex },
              { name: "Pembelian Aset (CapEx)", value: reportData.cashOut.capex },
          ].filter((item) => item.value > 0)
        : [];

    const totalCashOut = reportData?.cashOut.totalCashOut || 0;

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white dark:bg-zinc-950 p-4 rounded-xl border shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    {user && (user.role === "admin" || user.role === "owner") ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Outlet:</span>
                            <select
                                value={outletId || ""}
                                onChange={(e) => setOutletId(e.target.value || null)}
                                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                {outlets.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Dari:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="flex h-9 w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Sampai:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="flex h-9 w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground self-stretch lg:self-auto justify-between border-t lg:border-t-0 pt-2 lg:pt-0">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Periode Laporan
                    </div>
                    <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                        {format(new Date(startDate), "dd MMM yyyy", { locale: idLocale })} - {format(new Date(endDate), "dd MMM yyyy", { locale: idLocale })}
                    </span>
                </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-emerald-500 shadow-sm relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Kas Masuk (Cash In)</CardTitle>
                        <div className="p-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full">
                            <ArrowUpRight className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatIDR(reportData?.cashIn.revenue || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Total penerimaan dari omset real</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 shadow-sm relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Kas Keluar (Cash Out)</CardTitle>
                        <div className="p-1 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-full">
                            <ArrowDownRight className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {formatIDR(totalCashOut)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Pembelian + OpEx + CapEx</p>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 shadow-sm relative overflow-hidden ${(reportData?.netCashFlow || 0) >= 0 ? "border-l-blue-500" : "border-l-rose-500"}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Arus Kas Bersih (Net Cash Flow)</CardTitle>
                        <div className={`p-1 rounded-full ${(reportData?.netCashFlow || 0) >= 0 ? "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400" : "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400"}`}>
                            <Coins className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${(reportData?.netCashFlow || 0) >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {formatIDR(reportData?.netCashFlow || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Selisih Kas Masuk & Kas Keluar</p>
                    </CardContent>
                </Card>
            </div>

            {/* Breakdown Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Column 1: Cash Out Breakdown & Pie Chart */}
                <Card className="shadow-sm border">
                    <CardHeader className="bg-slate-50 dark:bg-zinc-900/50 border-b">
                        <CardTitle className="text-base font-semibold">Alokasi Kas Keluar</CardTitle>
                        <CardDescription>Komposisi penggunaan dana keluar pada periode terpilih</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {pieData.length === 0 ? (
                            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                                Tidak ada data kas keluar pada periode ini.
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="h-[200px] w-[200px] flex-shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip formatter={(value: any) => formatIDR(value)} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-4 flex-grow w-full">
                                    {pieData.map((item, idx) => {
                                        const percentage = totalCashOut > 0 ? (item.value / totalCashOut) * 100 : 0;
                                        return (
                                            <div key={item.name} className="space-y-1">
                                                <div className="flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                                                    </div>
                                                    <span className="font-semibold">{formatIDR(item.value)}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                                                                width: `${percentage}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground w-10 text-right">{percentage.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Column 2: Rincian Kas Keluar (OpEx & CapEx) */}
                <Card className="shadow-sm border">
                    <CardHeader className="bg-slate-50 dark:bg-zinc-900/50 border-b">
                        <CardTitle className="text-base font-semibold">Rincian Pengeluaran Kas</CardTitle>
                        <CardDescription>Detail pengeluaran Operasional (OpEx) dan Investasi Aset (CapEx)</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        {/* OpEx breakdown */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-1">
                                <ShoppingBag className="h-3.5 w-3.5 text-blue-500" />
                                Rincian Biaya Operasional (OpEx)
                            </h4>
                            <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1">
                                {Object.keys(reportData?.opexByCategory || {}).length === 0 ? (
                                    <div className="text-xs text-muted-foreground py-2 text-center">Tidak ada biaya operasional tercatat.</div>
                                ) : (
                                    Object.entries(reportData?.opexByCategory || {}).map(([cat, amount]) => (
                                        <div key={cat} className="flex justify-between items-center text-xs py-1 border-b border-dashed">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                {EXPENSE_CATEGORY_LABELS[cat] || cat}
                                            </span>
                                            <span className="font-semibold">{formatIDR(amount)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* CapEx details */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-1">
                                <Briefcase className="h-3.5 w-3.5 text-amber-500" />
                                Pembelian Aset Tetap (CapEx)
                            </h4>
                            <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1">
                                {!reportData || reportData.capexDetails.length === 0 ? (
                                    <div className="text-xs text-muted-foreground py-2 text-center">Tidak ada pembelian aset tetap periode ini.</div>
                                ) : (
                                    reportData.capexDetails.map((asset) => (
                                        <div key={asset.id} className="flex justify-between items-center text-xs py-1 border-b border-dashed">
                                            <div>
                                                <span className="font-medium text-slate-700 dark:text-slate-300 block">{asset.name}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Tanggal: {format(asset.purchaseDate, "dd MMM yyyy", { locale: idLocale })}
                                                </span>
                                            </div>
                                            <span className="font-semibold text-rose-600">{formatIDR(asset.amount)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Trend Chart */}
            <Card className="shadow-sm border">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 dark:bg-zinc-900/50 border-b">
                    <div>
                        <CardTitle className="text-base font-semibold">Tren Arus Kas Bulanan</CardTitle>
                        <CardDescription>Perbandingan Kas Masuk vs Kas Keluar bulanan</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">Periode Tren:</span>
                        <select
                            value={trendPeriod}
                            onChange={(e) => setTrendPeriod(e.target.value)}
                            className="h-8 rounded bg-background border px-2 text-xs shadow-sm transition-colors focus-visible:outline-none"
                        >
                            {TREND_PERIODS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {trendData.length === 0 ? (
                        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                            Data trend tidak tersedia.
                        </div>
                    ) : (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tickFormatter={(str) => {
                                            try {
                                                return format(parseISO(str), "MMM yy", { locale: idLocale });
                                            } catch (e) {
                                                return str;
                                            }
                                        }}
                                        fontSize={11}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tickFormatter={formatIDRShort}
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <RechartsTooltip
                                        labelFormatter={(label) => {
                                            try {
                                                return format(parseISO(label), "MMMM yyyy", { locale: idLocale });
                                            } catch (e) {
                                                return label;
                                            }
                                        }}
                                        formatter={(value: any) => [formatIDR(value)]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                                    <Bar dataKey="cashIn" name="Kas Masuk" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="totalCashOut" name="Kas Keluar" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Note box */}
            <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/10 p-4 text-xs text-blue-800 dark:text-blue-300 flex gap-2.5 items-start">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                    <span className="font-bold uppercase block text-blue-950 dark:text-blue-400">Catatan Arus Kas (Buku Kas):</span>
                    <p>
                        Laporan ini menyajikan mutasi kas riil yang masuk dan keluar dari outlet. Berbeda dengan Laporan Laba Rugi, pembelian aset tetap (CapEx) dicatat secara utuh sebagai Kas Keluar pada saat tanggal transaksi pembelian, dan biaya non-kas seperti penyusutan aset (depresiasi) **tidak** dimasukkan karena tidak ada aliran kas keluar saat penyusutan terjadi.
                    </p>
                    <p>
                        Pembelian bahan baku dengan <strong>paylater/hutang</strong> yang belum dibayar <strong>tidak dihitung</strong> sebagai Kas Keluar sampai pembayaran dicatat lunas di halaman Pembelian.
                    </p>
                </div>
            </div>
        </div>
    );
}
