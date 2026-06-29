"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
    getNetProfitAnalytics,
    getMonthlyProfitSummary,
    getDailyProfitTrend,
} from "@/actions/analytics";
import {
    DollarSign,
    TrendingUp,
    Receipt,
    Loader2,
    ShoppingBag,
    Building2,
    Info,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
    OPERATIONAL: "Operasional",
    SALARY: "Gaji",
    UTILITY: "Utilitas (Listrik/Air/Gas)",
    RENT: "Sewa Tempat",
    STOCK_LOSS: "Waste/Loss",
    DEPRECIATION: "Penyusutan Aset",
    OTHER: "Lain-lain",
};

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#ef4444", "#64748b", "#6b7280"];

const PERIOD_OPTIONS = [
    { value: "3", label: "3 Bulan" },
    { value: "6", label: "6 Bulan" },
    { value: "12", label: "1 Tahun" },
];

export function ProfitDashboardClient() {
    const { user } = useCurrentUser();
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [outletId, setOutletId] = useState<string | null>(null);
    const [periodMonths, setPeriodMonths] = useState("6");
    
    // Date Range State
    const [dateFilter, setDateFilter] = useState<'7_days' | 'this_month' | '30_days' | 'custom'>('this_month');
    const [customStartDate, setCustomStartDate] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
    const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Data
    const [currentMonth, setCurrentMonth] = useState<{
        grossRevenue: number;
        cogs: number;
        opexAmount: number;
        depreciationExpense: number;
        totalExpenses: number;
        netProfit: number;
        margin: number;
        expensesByCategory: Record<string, number>;
    } | null>(null);
    const [monthlyData, setMonthlyData] = useState<Array<{
        month: string;
        grossRevenue: number;
        cogs: number;
        opexAmount: number;
        depreciationExpense: number;
        totalExpenses: number;
        netProfit: number;
        margin: number;
    }>>([]);
    const [dailyData, setDailyData] = useState<Array<{
        date: string;
        revenue: number;
        cogs: number;
        expenses: number;
        netProfit: number;
    }>>([]);

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

    useEffect(() => {
        async function fetchAll() {
            if (!outletId) return;
            setLoading(true);
            try {
                const now = new Date();
                let monthStart: Date;
                let monthEnd: Date;
                
                if (dateFilter === '7_days') {
                    monthStart = subDays(now, 6);
                    monthEnd = now;
                } else if (dateFilter === '30_days') {
                    monthStart = subDays(now, 29);
                    monthEnd = now;
                } else if (dateFilter === 'this_month') {
                    monthStart = startOfMonth(now);
                    monthEnd = endOfMonth(now);
                } else {
                    monthStart = new Date(customStartDate);
                    monthEnd = new Date(customEndDate);
                }

                const [currentData, monthly, daily] = await Promise.all([
                    getNetProfitAnalytics(outletId, monthStart, monthEnd),
                    getMonthlyProfitSummary(outletId, Number(periodMonths)),
                    getDailyProfitTrend(outletId, monthStart, monthEnd),
                ]);

                setCurrentMonth(currentData);
                setMonthlyData(monthly);
                setDailyData(daily);
            } catch (err) {
                console.error("Failed to fetch analytics:", err);
            } finally {
                setLoading(false);
            }
        }
        if (user && outletId) {
            if (dateFilter !== 'custom' || (customStartDate && customEndDate)) {
                fetchAll();
            }
        }
    }, [user, outletId, periodMonths, dateFilter, customStartDate, customEndDate]);

    const formatIDR = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    const formatIDRShort = (val: number) => {
        if (Math.abs(val) >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}jt`;
        if (Math.abs(val) >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}rb`;
        return `Rp ${val}`;
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const pieData = currentMonth
        ? Object.entries(currentMonth.expensesByCategory).map(([key, value]) => ({
              name: EXPENSE_CATEGORY_LABELS[key] || key,
              value,
          }))
        : [];

    return (
        <div className="space-y-6">
            {/* Header controls */}
            <div className="flex flex-col gap-4 bg-white dark:bg-zinc-950 p-4 rounded-xl border shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button 
                            variant={dateFilter === '7_days' ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => setDateFilter('7_days')}
                        >
                            7 Hari Terakhir
                        </Button>
                        <Button 
                            variant={dateFilter === 'this_month' ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => setDateFilter('this_month')}
                        >
                            Bulan Ini
                        </Button>
                        <Button 
                            variant={dateFilter === '30_days' ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => setDateFilter('30_days')}
                        >
                            30 Hari Terakhir
                        </Button>
                        <Button 
                            variant={dateFilter === 'custom' ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => setDateFilter('custom')}
                        >
                            Custom Range
                        </Button>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Trend Bulanan:</span>
                            <select
                                value={periodMonths}
                                onChange={(e) => setPeriodMonths(e.target.value)}
                                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                {PERIOD_OPTIONS.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                        {user && (user.role === "admin" || user.role === "owner") ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Outlet:</span>
                                <select
                                    value={outletId || ""}
                                    onChange={(e) => setOutletId(e.target.value || null)}
                                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="">Semua Outlet</option>
                                    {outlets.map((o) => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : null}
                    </div>
                </div>

                {dateFilter === 'custom' && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Dari:</span>
                        <input 
                            type="date" 
                            value={customStartDate} 
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        />
                        <span className="text-sm text-muted-foreground ml-2">Sampai:</span>
                        <input 
                            type="date" 
                            value={customEndDate} 
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                        />
                    </div>
                )}
                
                <div className="text-sm text-muted-foreground pt-1">
                    Menampilkan data untuk: <strong>
                        {dateFilter === '7_days' ? '7 Hari Terakhir' : 
                         dateFilter === 'this_month' ? 'Bulan Ini' : 
                         dateFilter === '30_days' ? '30 Hari Terakhir' : 
                         `${format(new Date(customStartDate), 'dd MMM yyyy', { locale: idLocale })} - ${format(new Date(customEndDate), 'dd MMM yyyy', { locale: idLocale })}`}
                    </strong>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pendapatan Kotor</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            {formatIDR(currentMonth?.grossRevenue || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Omset real sesuai filter</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">COGS (HPP)</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {formatIDR(currentMonth?.cogs || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Bahan baku terpakai (Opname)</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Biaya Operasional + Penyusutan</CardTitle>
                        <Receipt className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {formatIDR(currentMonth?.totalExpenses || 0)}
                        </div>
                        <div className="space-y-0.5 mt-1">
                            <p className="text-xs text-muted-foreground">
                                OpEx: {formatIDR(currentMonth?.opexAmount || 0)}
                            </p>
                            {(currentMonth?.depreciationExpense || 0) > 0 && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    Penyusutan: {formatIDR(currentMonth?.depreciationExpense || 0)}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 shadow-sm ${(currentMonth?.netProfit || 0) >= 0 ? "border-l-blue-500" : "border-l-amber-500"}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Laba Bersih (Net Profit)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${(currentMonth?.netProfit || 0) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                            {formatIDR(currentMonth?.netProfit || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Margin Laba: {(currentMonth?.margin || 0).toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Info banner about depreciation */}
            {(currentMonth?.depreciationExpense || 0) > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg border bg-indigo-50/50 dark:bg-indigo-950/10 text-indigo-800 dark:text-indigo-300">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p className="text-xs">
                        Laba Bersih sudah memperhitungkan <strong>Biaya Penyusutan Aset sebesar {formatIDR(currentMonth?.depreciationExpense || 0)}/bulan</strong>. 
                        Pembelian aset (CapEx) tidak langsung memotong laba, nilainya disusutkan secara bertahap sesuai masa manfaat.
                    </p>
                </div>
            )}

            {/* Charts row 1: Monthly Trend + Expense Breakdown */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-1 md:col-span-2 lg:col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle>Trend Profit Bulanan</CardTitle>
                        <CardDescription>Perbandingan Pendapatan, HPP (COGS), Opex + Penyusutan, dan Laba Bersih</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[320px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => format(new Date(val), "MMM yy", { locale: idLocale })}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => formatIDRShort(val)}
                                />
                                <Tooltip
                                    formatter={(value: any, name: any) => [formatIDR(value), name]}
                                    labelFormatter={(val) => format(new Date(val), "MMMM yyyy", { locale: idLocale })}
                                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                />
                                <Bar dataKey="grossRevenue" name="Pendapatan" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="cogs" name="COGS (HPP)" fill="#f97316" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="totalExpenses" name="Opex + Penyusutan" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="netProfit" name="Laba Bersih" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-2 lg:col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle>Breakdown Opex + Penyusutan</CardTitle>
                        <CardDescription>Proporsi biaya operasional dan penyusutan di periode ini</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[320px] flex items-center justify-center">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    >
                                        {pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => formatIDR(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-muted-foreground text-sm">
                                Belum ada data biaya operasional di periode ini.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts row 2: Daily Trend */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Trend Harian</CardTitle>
                    <CardDescription>Pendapatan vs COGS + Opex harian</CardDescription>
                </CardHeader>
                <CardContent className="h-[280px] pt-4">
                    {dailyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => format(new Date(val), "dd", { locale: idLocale })}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => formatIDRShort(val)}
                                />
                                <Tooltip
                                    formatter={(value: any, name: any) => [formatIDR(value), name]}
                                    labelFormatter={(val) => format(new Date(val), "dd MMMM yyyy", { locale: idLocale })}
                                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                />
                                <Line type="monotone" dataKey="revenue" name="Pendapatan" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="cogs" name="COGS (HPP)" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="expenses" name="Opex" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="netProfit" name="Laba Bersih" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6" }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                            Belum ada data di periode ini. Catat omset real, opex, dan lakukan stock opname untuk melihat trend.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Monthly Summary Table */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                    <CardTitle>Ringkasan Laporan Laba Rugi Bulanan</CardTitle>
                    <CardDescription>Performa keuangan per bulan. Kolom &quot;Opex + Susut&quot; sudah termasuk biaya penyusutan aset.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="hidden md:block overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-zinc-900 border-b">
                                    <tr>
                                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Bulan</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Pendapatan</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">COGS (HPP)</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">OpEx</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Penyusutan</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Laba Bersih</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Margin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {monthlyData.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                                Belum ada data.
                                            </td>
                                        </tr>
                                    ) : (
                                        monthlyData.map((row) => (
                                            <tr key={row.month} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                                <td className="p-3 font-medium whitespace-nowrap">
                                                    {format(new Date(row.month), "MMMM yyyy", { locale: idLocale })}
                                                </td>
                                                <td className="p-3 text-right text-emerald-600 font-medium whitespace-nowrap">
                                                    {formatIDR(row.grossRevenue)}
                                                </td>
                                                <td className="p-3 text-right text-orange-600 font-medium whitespace-nowrap">
                                                    {formatIDR(row.cogs || 0)}
                                                </td>
                                                <td className="p-3 text-right text-red-600 font-medium whitespace-nowrap">
                                                    {formatIDR(row.opexAmount)}
                                                </td>
                                                <td className="p-3 text-right text-slate-500 font-medium whitespace-nowrap">
                                                    {row.depreciationExpense > 0 ? formatIDR(row.depreciationExpense) : "—"}
                                                </td>
                                                <td className={`p-3 text-right font-bold whitespace-nowrap ${row.netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                                                    {formatIDR(row.netProfit)}
                                                </td>
                                                <td className="p-3 text-right whitespace-nowrap">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${row.margin >= 30 ? "bg-emerald-100 text-emerald-700" : row.margin >= 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                                                        {row.margin.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View */}
                        <div className="md:hidden space-y-4">
                            {monthlyData.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground border rounded-md bg-slate-50 dark:bg-zinc-900/50">
                                    Belum ada data.
                                </div>
                            ) : (
                                monthlyData.map((row) => (
                                    <div key={row.month} className="bg-white dark:bg-zinc-950 border rounded-lg p-4 space-y-4 shadow-sm">
                                        <div className="flex justify-between items-center border-b pb-3">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                                                {format(new Date(row.month), "MMMM yyyy", { locale: idLocale })}
                                            </div>
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${row.margin >= 30 ? "bg-emerald-100 text-emerald-700" : row.margin >= 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                                                Margin: {row.margin.toFixed(1)}%
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="space-y-1">
                                                <div className="text-xs text-muted-foreground">Pendapatan</div>
                                                <div className="font-medium text-emerald-600 dark:text-emerald-400">{formatIDR(row.grossRevenue)}</div>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <div className="text-xs text-muted-foreground">COGS (HPP)</div>
                                                <div className="font-medium text-orange-600 dark:text-orange-400">{formatIDR(row.cogs || 0)}</div>
                                            </div>
                                            
                                            <div className="space-y-1">
                                                <div className="text-xs text-muted-foreground">OpEx</div>
                                                <div className="font-medium text-red-600 dark:text-red-400">{formatIDR(row.opexAmount)}</div>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <div className="text-xs text-muted-foreground">Penyusutan</div>
                                                <div className="font-medium text-slate-500 dark:text-slate-400">{row.depreciationExpense > 0 ? formatIDR(row.depreciationExpense) : "—"}</div>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t flex justify-between items-center">
                                            <span className="font-medium text-sm text-slate-700 dark:text-slate-300">Laba Bersih</span>
                                            <span className={`font-bold text-lg ${row.netProfit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
                                                {formatIDR(row.netProfit)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
