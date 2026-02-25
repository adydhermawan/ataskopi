"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    DollarSign,
    Package,
    ShoppingCart,
    TrendingUp,
    Loader2,
    Calendar,
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
    Cell,
    PieChart,
    Pie,
} from "recharts";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface DashboardData {
    today: {
        totalRevenue: number;
        totalOrders: number;
        totalItems: number;
        averageTicket: number;
    };
    history: Array<{
        date: string;
        totalRevenue: number;
        totalOrders: number;
        totalItems: number;
        topProducts: Array<{ name: string; qty: number; revenue: number }>;
        paymentMix: Record<string, number>;
    }>;
    period: {
        days: number;
        startDate: string | null;
        endDate: string | null;
    };
}

export function DashboardClient({ outletId: initialOutletId }: { outletId?: string | null }) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [outletId, setOutletId] = useState<string | null>(initialOutletId || null);

    useEffect(() => {
        async function fetchDashboard() {
            setLoading(true);
            try {
                const url = new URL("/api/dashboard", window.location.origin);
                url.searchParams.set("days", "7");
                if (outletId) url.searchParams.set("outletId", outletId);

                const response = await fetch(url.toString());
                if (!response.ok) throw new Error("Failed to fetch dashboard data");
                const json = await response.json();
                setData(json.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        }

        fetchDashboard();
    }, [outletId]);

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-[400px] items-center justify-center text-destructive">
                {error || "No data available"}
            </div>
        );
    }

    // Aggregate data by date
    const aggregatedHistory = data.history.reduce((acc, current) => {
        const dateStr = format(new Date(current.date), "yyyy-MM-dd");
        if (!acc[dateStr]) {
            acc[dateStr] = {
                date: dateStr,
                name: format(new Date(current.date), "EEE", { locale: id }),
                revenue: 0,
                orders: 0,
            };
        }
        acc[dateStr].revenue += Number(current.totalRevenue);
        acc[dateStr].orders += current.totalOrders;
        return acc;
    }, {} as Record<string, { date: string; name: string; revenue: number; orders: number }>);

    const chartData = Object.keys(aggregatedHistory)
        .sort()
        .map((key) => aggregatedHistory[key]);

    // Consolidate payment mix
    const paymentMix: Record<string, number> = {};
    data.history.forEach((h) => {
        Object.entries(h.paymentMix).forEach(([method, count]) => {
            paymentMix[method] = (paymentMix[method] || 0) + count;
        });
    });

    const pieData = Object.entries(paymentMix).map(([name, value]) => ({ name, value }));
    const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe"];

    // Consolidated Top Products
    const topProductsMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    data.history.forEach((h) => {
        (h.topProducts as any[]).forEach((p) => {
            if (!topProductsMap[p.name]) {
                topProductsMap[p.name] = { name: p.name, qty: 0, revenue: 0 };
            }
            topProductsMap[p.name].qty += p.qty;
            topProductsMap[p.name].revenue += p.revenue;
        });
    });

    const sortedTopProducts = Object.values(topProductsMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

    const formatIDR = (val: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(val);
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-primary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue Hari Ini</CardTitle>
                        <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatIDR(data.today.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Omzet kotor hari ini</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pesanan</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.today.totalOrders}</div>
                        <p className="text-xs text-muted-foreground">Total transaksi masuk</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Produk Terjual</CardTitle>
                        <Package className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.today.totalItems}</div>
                        <p className="text-xs text-muted-foreground">Jumlah item diproduksi</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rata-rata Transaksi</CardTitle>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatIDR(data.today.averageTicket)}</div>
                        <p className="text-xs text-muted-foreground">Nilai per transaksi</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Revenue Trend */}
                <Card className="col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            Tren Penjualan (7 Hari Terakhir)
                        </CardTitle>
                        <CardDescription>Grafik pendapatan harian outlet</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => format(new Date(val), "EEE", { locale: id })}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => `Rp ${val / 1000}k`}
                                />
                                <Tooltip
                                    formatter={(value: any) => formatIDR(value)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Products */}
                <Card className="col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle>Produk Terlaris</CardTitle>
                        <CardDescription>Berdasarkan kuantitas terjual</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {sortedTopProducts.map((product, idx) => (
                                <div key={idx} className="flex items-center">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted font-bold text-muted-foreground">
                                        {idx + 1}
                                    </div>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">{product.qty} unit terjual</p>
                                    </div>
                                    <div className="ml-auto font-medium text-sm">
                                        {formatIDR(product.revenue)}
                                    </div>
                                </div>
                            ))}
                            {sortedTopProducts.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    Belum ada data produk.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Payment Methods */}
                <Card className="col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle>Metode Pembayaran</CardTitle>
                        <CardDescription>Distribusi penggunaan pembayaran</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="ml-4 space-y-2">
                            {pieData.map((e, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="font-medium">{e.name}:</span>
                                    <span>{e.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Weekly Orders Trend */}
                <Card className="col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle>Volume Pesanan</CardTitle>
                        <CardDescription>Jumlah transaksi harian</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => format(new Date(val), "EEE", { locale: id })}
                                />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981" }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
