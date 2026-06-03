"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import {
    getDailyRealRevenues,
    saveDailyRealRevenue,
    deleteDailyRealRevenue
} from "@/actions/real-revenue";
import {
    DollarSign,
    Package,
    ShoppingCart,
    TrendingUp,
    Loader2,
    Calendar,
    Plus,
    Edit,
    Trash,
    Scale,
    TrendingDown,
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
        realRevenue?: number;
    };
    history: Array<{
        date: string;
        totalRevenue: number;
        totalOrders: number;
        totalItems: number;
        topProducts: Array<{ name: string; qty: number; revenue: number }>;
        paymentMix: Record<string, number>;
    }>;
    realRevenueHistory?: Array<{
        id: string;
        date: string;
        outletId: string;
        amount: number;
        notes: string | null;
    }>;
    period: {
        days: number;
        startDate: string | null;
        endDate: string | null;
    };
}

export function DashboardClient({ outletId: initialOutletId }: { outletId?: string | null }) {
    const { user } = useCurrentUser();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [outletId, setOutletId] = useState<string | null>(initialOutletId || null);
    
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [realRevenueLogs, setRealRevenueLogs] = useState<any[]>([]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<any | null>(null);
    const [formDate, setFormDate] = useState("");
    const [formOutletId, setFormOutletId] = useState("");
    const [formAmount, setFormAmount] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formSubmitting, setFormSubmitting] = useState(false);

    // Lock cashier to their assigned outlet
    useEffect(() => {
        if (user && user.role === 'kasir' && user.outletId) {
            setOutletId(user.outletId);
        }
    }, [user]);

    // Fetch outlets
    useEffect(() => {
        if (user) {
            fetch('/api/outlets')
                .then(res => res.json())
                .then(json => {
                    if (json.success) {
                        setOutlets(json.data);
                    }
                })
                .catch(err => console.error("Failed to fetch outlets:", err));
        }
    }, [user]);

    // Fetch dashboard data
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

        if (user) {
            fetchDashboard();
        }
    }, [outletId, user]);

    // Fetch manual real revenue logs
    useEffect(() => {
        async function fetchLogs() {
            try {
                const logs = await getDailyRealRevenues(outletId);
                setRealRevenueLogs(logs);
            } catch (err) {
                console.error("Failed to load real revenue logs:", err);
            }
        }
        if (user) {
            fetchLogs();
        }
    }, [outletId, user]);

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
                realRevenue: 0,
                orders: 0,
            };
        }
        acc[dateStr].revenue += Number(current.totalRevenue);
        acc[dateStr].orders += current.totalOrders;
        return acc;
    }, {} as Record<string, { date: string; name: string; revenue: number; realRevenue: number; orders: number }>);

    // Merge manual real revenue history
    if (data.realRevenueHistory) {
        data.realRevenueHistory.forEach((r) => {
            const dateStr = format(new Date(r.date), "yyyy-MM-dd");
            if (!aggregatedHistory[dateStr]) {
                aggregatedHistory[dateStr] = {
                    date: dateStr,
                    name: format(new Date(r.date), "EEE", { locale: id }),
                    revenue: 0,
                    realRevenue: 0,
                    orders: 0,
                };
            }
            aggregatedHistory[dateStr].realRevenue += Number(r.amount);
        });
    }

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
    const COLORS = ["#3b82f6", "#10b981", "#ffc658", "#ff8042", "#8884d8"];

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

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormSubmitting(true);
        try {
            const res = await saveDailyRealRevenue({
                id: editingLog?.id,
                date: formDate,
                outletId: formOutletId,
                amount: Number(formAmount),
                notes: formNotes,
            });

            if (res.success) {
                toast.success(editingLog ? "Catatan omset berhasil diperbarui" : "Omset real berhasil dicatat");
                setIsModalOpen(false);
                
                // Re-fetch dashboard data
                const url = new URL("/api/dashboard", window.location.origin);
                url.searchParams.set("days", "7");
                if (outletId) url.searchParams.set("outletId", outletId);
                const response = await fetch(url.toString());
                if (response.ok) {
                    const json = await response.json();
                    setData(json.data);
                }

                // Re-fetch logs
                const logs = await getDailyRealRevenues(outletId);
                setRealRevenueLogs(logs);
            } else {
                toast.error(res.error || "Gagal menyimpan omset real");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDeleteLog = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus catatan omset real ini?")) return;
        try {
            const res = await deleteDailyRealRevenue(id);
            if (res.success) {
                toast.success("Catatan omset berhasil dihapus");
                
                // Re-fetch dashboard data
                const url = new URL("/api/dashboard", window.location.origin);
                url.searchParams.set("days", "7");
                if (outletId) url.searchParams.set("outletId", outletId);
                const response = await fetch(url.toString());
                if (response.ok) {
                    const json = await response.json();
                    setData(json.data);
                }

                // Re-fetch logs
                const logs = await getDailyRealRevenues(outletId);
                setRealRevenueLogs(logs);
            } else {
                toast.error("Gagal menghapus catatan");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        }
    };

    const todayRecorded = data.today.totalRevenue;
    const todayReal = data.today.realRevenue || 0;
    const todayVariance = todayReal - todayRecorded;

    return (
        <div className="space-y-6">
            {/* Header controls: Filter and Action */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-zinc-950 p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-3">
                    {user && (user.role === 'admin' || user.role === 'owner') ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Filter Outlet:</span>
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
                    ) : (
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Outlet: {user?.outletId ? outlets.find(o => o.id === user.outletId)?.name || "Designated Outlet" : "Semua"}
                        </div>
                    )}
                </div>

                <Button 
                    onClick={() => {
                        setEditingLog(null);
                        setFormDate(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD local format
                        setFormOutletId(user?.outletId || outletId || (outlets[0]?.id || ""));
                        setFormAmount("");
                        setFormNotes("");
                        setIsModalOpen(true);
                    }}
                    className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                    <Plus className="h-4 w-4" /> Catat Omset Real
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Card 1: Revenue Tercatat Web */}
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Omset Tercatat (Web)</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatIDR(todayRecorded)}</div>
                        <p className="text-xs text-muted-foreground">Total orderan via web hari ini</p>
                    </CardContent>
                </Card>

                {/* Card 2: Omset Real */}
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Omset Real (Manual)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {todayReal > 0 ? formatIDR(todayReal) : "Belum Dicatat"}
                        </div>
                        <p className="text-xs text-muted-foreground">Total penjualan riil (offline + online)</p>
                    </CardContent>
                </Card>

                {/* Card 3: Selisih / Variance */}
                <Card className={`border-l-4 shadow-sm ${
                    todayReal === 0 
                        ? "border-l-slate-400" 
                        : todayVariance >= 0 
                            ? "border-l-teal-500" 
                            : "border-l-amber-500"
                }`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Selisih (Offline / Lainnya)</CardTitle>
                        {todayVariance >= 0 ? (
                            <Scale className="h-4 w-4 text-teal-500" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-amber-500" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${
                            todayReal === 0
                                ? "text-slate-500"
                                : todayVariance >= 0
                                    ? "text-teal-600 dark:text-teal-400"
                                    : "text-amber-600 dark:text-amber-400"
                        }`}>
                            {todayReal === 0 ? "Rp 0" : (todayVariance >= 0 ? "+" : "") + formatIDR(todayVariance)}
                        </div>
                        <p className="text-xs text-muted-foreground">Pendapatan offline yang tidak tercatat web</p>
                    </CardContent>
                </Card>

                {/* Card 4: Orders & Products sold */}
                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Volume Pesanan</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.today.totalOrders} order</div>
                        <p className="text-xs text-muted-foreground">{data.today.totalItems} item produk terjual via web</p>
                    </CardContent>
                </Card>
            </div>

            {/* Comparison Trend Chart */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Revenue Trend */}
                <Card className="col-span-1 md:col-span-2 lg:col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            Perbandingan Omset (7 Hari Terakhir)
                        </CardTitle>
                        <CardDescription>Grafik perbandingan pendapatan tercatat web vs omset real harian</CardDescription>
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
                                    formatter={(value: any, name: any) => [formatIDR(value), name]}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="revenue" name="Tercatat (Web)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="realRevenue" name="Omset Real (Manual)" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
 
                {/* Top Products */}
                <Card className="col-span-1 md:col-span-2 lg:col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle>Produk Terlaris</CardTitle>
                        <CardDescription>Berdasarkan kuantitas terjual via web</CardDescription>
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
                <Card className="col-span-1 md:col-span-2 lg:col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle>Metode Pembayaran</CardTitle>
                        <CardDescription>Distribusi penggunaan pembayaran web</CardDescription>
                    </CardHeader>
                    <CardContent className="h-auto min-h-[250px] flex flex-col sm:flex-row items-center justify-center gap-4 py-4">
                        <div className="w-full h-[200px] flex-1">
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
                        </div>
                        <div className="sm:ml-4 space-y-1.5 sm:space-y-2 flex flex-row sm:flex-col flex-wrap justify-center gap-x-4 gap-y-1 shrink-0">
                            {pieData.map((e, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="font-medium whitespace-nowrap">{e.name}:</span>
                                    <span className="whitespace-nowrap">{e.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
 
                {/* Weekly Orders Trend */}
                <Card className="col-span-1 md:col-span-2 lg:col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle>Volume Pesanan</CardTitle>
                        <CardDescription>Jumlah transaksi harian via web</CardDescription>
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
                                <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Real Revenue Table Manager */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                    <CardTitle>Riwayat Omset Real Harian</CardTitle>
                    <CardDescription>
                        Daftar catatan omset harian real yang diinput secara manual untuk perbandingan.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="p-3 text-left font-semibold text-slate-700">Tanggal</th>
                                    <th className="p-3 text-left font-semibold text-slate-700">Outlet</th>
                                    <th className="p-3 text-right font-semibold text-slate-700">Omset Real</th>
                                    <th className="p-3 text-left font-semibold text-slate-700">Catatan</th>
                                    <th className="p-3 text-right font-semibold text-slate-700">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {realRevenueLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            Belum ada catatan omset real untuk outlet terpilih.
                                        </td>
                                    </tr>
                                ) : (
                                    realRevenueLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-3 font-medium text-slate-900">
                                                {format(new Date(log.date + "T00:00:00Z"), "dd MMMM yyyy", { locale: id })}
                                            </td>
                                            <td className="p-3 text-slate-700">{log.outletName}</td>
                                            <td className="p-3 text-right font-bold text-emerald-600">
                                                {formatIDR(log.amount)}
                                            </td>
                                            <td className="p-3 text-slate-600 max-w-xs truncate" title={log.notes || ""}>
                                                {log.notes || "-"}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingLog(log);
                                                            setFormDate(log.date);
                                                            setFormOutletId(log.outletId);
                                                            setFormAmount(log.amount.toString());
                                                            setFormNotes(log.notes || "");
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    {user && (user.role === 'admin' || user.role === 'owner') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteLog(log.id)}
                                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    )}
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

            {/* Input / Edit Modal */}
            <Modal
                title={editingLog ? "Edit Omset Real" : "Catat Omset Real"}
                description={editingLog ? "Perbarui catatan omset harian real" : "Masukkan jumlah pendapatan real (offline + online) harian untuk outlet terpilih."}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            >
                <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Tanggal</label>
                        <input
                            type="date"
                            required
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium">Outlet</label>
                        {user && (user.role === 'admin' || user.role === 'owner') ? (
                            <select
                                required
                                value={formOutletId}
                                onChange={(e) => setFormOutletId(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="" disabled>Pilih Outlet</option>
                                {outlets.map((o) => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="h-9 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground flex items-center">
                                {outlets.find(o => o.id === formOutletId)?.name || "Designated Outlet"}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium">Jumlah Omset Real (Rp)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            placeholder="Contoh: 1500000"
                            value={formAmount}
                            onChange={(e) => setFormAmount(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium">Catatan (Optional)</label>
                        <textarea
                            placeholder="Keterangan tambahan (misal: cuaca hujan, ramai event offline)"
                            value={formNotes || ""}
                            onChange={(e) => setFormNotes(e.target.value)}
                            rows={3}
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            disabled={formSubmitting}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={formSubmitting}
                        >
                            {formSubmitting ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
