"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
    getNetProfitAnalytics,
    getMonthlyProfitSummary,
    getDailyProfitTrend,
} from "@/actions/analytics";
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Receipt,
    Loader2,
    Percent,
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
    Legend,
} from "recharts";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
    RAW_MATERIAL: "Bahan Baku",
    OPERATIONAL: "Operasional",
    SALARY: "Gaji",
    STOCK_LOSS: "Waste/Loss",
    OTHER: "Lain-lain",
};

const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#6b7280", "#f59e0b"];

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

    // Data
    const [currentMonth, setCurrentMonth] = useState<{
        grossRevenue: number;
        totalExpenses: number;
        netProfit: number;
        margin: number;
        expensesByCategory: Record<string, number>;
    } | null>(null);
    const [monthlyData, setMonthlyData] = useState<Array<{
        month: string;
        grossRevenue: number;
        totalExpenses: number;
        netProfit: number;
        margin: number;
    }>>([]);
    const [dailyData, setDailyData] = useState<Array<{
        date: string;
        revenue: number;
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
                const monthStart = startOfMonth(now);
                const monthEnd = endOfMonth(now);

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
        if (user && outletId) fetchAll();
    }, [user, outletId, periodMonths]);

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
                        <span className="text-sm font-medium text-muted-foreground">Trend:</span>
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
                </div>
                <div className="text-sm text-muted-foreground">
                    Data bulan: <strong>{format(new Date(), "MMMM yyyy", { locale: idLocale })}</strong>
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
                        <p className="text-xs text-muted-foreground">Omset real bulan ini</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {formatIDR(currentMonth?.totalExpenses || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Bahan baku + operasional + lainnya</p>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 shadow-sm ${(currentMonth?.netProfit || 0) >= 0 ? "border-l-blue-500" : "border-l-amber-500"}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${(currentMonth?.netProfit || 0) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                            {formatIDR(currentMonth?.netProfit || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Pendapatan − Pengeluaran</p>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 shadow-sm ${(currentMonth?.margin || 0) >= 30 ? "border-l-emerald-500" : "border-l-amber-500"}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                        <Percent className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${(currentMonth?.margin || 0) >= 30 ? "text-emerald-600" : "text-amber-600"}`}>
                            {(currentMonth?.margin || 0).toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {(currentMonth?.margin || 0) >= 30 ? "Margin sehat ✓" : "Margin rendah ⚠️"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts row 1: Monthly Trend + Expense Breakdown */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle>Trend Profit Bulanan</CardTitle>
                        <CardDescription>Perbandingan Pendapatan, Pengeluaran, dan Net Profit per bulan</CardDescription>
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
                                <Bar dataKey="totalExpenses" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="netProfit" name="Net Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle>Breakdown Pengeluaran</CardTitle>
                        <CardDescription>Proporsi per kategori bulan ini</CardDescription>
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
                                Belum ada data pengeluaran bulan ini.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts row 2: Daily Trend */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Trend Harian (Bulan Ini)</CardTitle>
                    <CardDescription>Pendapatan vs Pengeluaran harian</CardDescription>
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
                                <Line type="monotone" dataKey="expenses" name="Pengeluaran" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6" }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                            Belum ada data bulan ini. Catat omset real dan pengeluaran untuk melihat trend.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Monthly Summary Table */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                    <CardTitle>Ringkasan Bulanan</CardTitle>
                    <CardDescription>Performa keuangan per bulan</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-zinc-900 border-b">
                                <tr>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Bulan</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Pendapatan</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Pengeluaran</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Net Profit</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Margin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {monthlyData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            Belum ada data.
                                        </td>
                                    </tr>
                                ) : (
                                    monthlyData.map((row) => (
                                        <tr key={row.month} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                            <td className="p-3 font-medium">
                                                {format(new Date(row.month), "MMMM yyyy", { locale: idLocale })}
                                            </td>
                                            <td className="p-3 text-right text-emerald-600 font-medium">{formatIDR(row.grossRevenue)}</td>
                                            <td className="p-3 text-right text-red-600 font-medium">{formatIDR(row.totalExpenses)}</td>
                                            <td className={`p-3 text-right font-bold ${row.netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                                                {formatIDR(row.netProfit)}
                                            </td>
                                            <td className="p-3 text-right">
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
                </CardContent>
            </Card>
        </div>
    );
}
