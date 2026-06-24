"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import { getMaterialMovementReport, MaterialMovementReport } from "@/actions/inventory-report";
import { Loader2, Package, TrendingUp, TrendingDown, Search, FileDown } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export function MaterialReportClient() {
    const { user } = useCurrentUser();
    const [reports, setReports] = useState<MaterialMovementReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [outletId, setOutletId] = useState<string | null>(null);

    const [startDate, setStartDate] = useState<string>(
        format(startOfMonth(new Date()), "yyyy-MM-dd")
    );
    const [endDate, setEndDate] = useState<string>(
        format(endOfMonth(new Date()), "yyyy-MM-dd")
    );
    
    const [searchQuery, setSearchQuery] = useState("");

    // Lock kasir to their outlet
    useEffect(() => {
        if (user && user.role === "kasir" && user.outletId) {
            setOutletId(user.outletId);
        }
    }, [user]);

    // Fetch outlets
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

    // Fetch report data
    const fetchReport = async () => {
        if (!outletId || !startDate || !endDate) return;
        setLoading(true);
        try {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const data = await getMaterialMovementReport(outletId, start, end);
            setReports(data);
        } catch (err) {
            console.error("Failed to fetch report:", err);
            toast.error("Gagal memuat data laporan");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && outletId && startDate && endDate) {
            fetchReport();
        }
    }, [user, outletId, startDate, endDate]);

    const formatIDR = (val: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(val);

    const filteredReports = useMemo(() => {
        if (!searchQuery) return reports;
        const q = searchQuery.toLowerCase();
        return reports.filter(r => r.name.toLowerCase().includes(q));
    }, [reports, searchQuery]);

    const totalPurchasedValue = reports.reduce((sum, r) => sum + r.purchasedValue, 0);
    const totalUsedValue = reports.reduce((sum, r) => sum + r.usedValue, 0);

    const handleExportCSV = () => {
        const headers = ["Nama Bahan Baku", "Satuan", "Sisa Stok", "Qty Dibeli", "Nilai Dibeli (Rp)", "Qty Digunakan", "Nilai Digunakan (Rp)"];
        const rows = filteredReports.map(r => [
            r.name,
            r.unit,
            r.currentStock,
            r.purchasedQty,
            r.purchasedValue,
            r.usedQty,
            r.usedValue
        ]);
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Laporan_Bahan_Baku_${startDate}_sd_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-zinc-950 p-4 rounded-xl border shadow-sm">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {user && (user.role === "admin" || user.role === "owner") ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Outlet:</span>
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
                    ) : (
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Outlet: {outlets.find((o) => o.id === outletId)?.name || "—"}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <span className="text-muted-foreground text-sm">s/d</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                     <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari bahan baku..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={handleExportCSV} title="Export CSV">
                        <FileDown className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bahan Baku Aktif</CardTitle>
                        <Package className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reports.length} item</div>
                        <p className="text-xs text-muted-foreground">dalam rentang tanggal ini</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nilai Pembelian</CardTitle>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{formatIDR(totalPurchasedValue)}</div>
                        <p className="text-xs text-muted-foreground">Total dari barang diterima</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nilai Penggunaan</CardTitle>
                        <TrendingDown className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{formatIDR(totalUsedValue)}</div>
                        <p className="text-xs text-muted-foreground">Berdasarkan hasil Stock Opname</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                    <CardTitle>Rekapitulasi Pergerakan Bahan Baku</CardTitle>
                    <CardDescription>
                        Menampilkan jumlah terbeli dan digunakan pada rentang tanggal terpilih. Nilai penggunaan didapat dari selisih negatif pada Stock Opname.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-[200px] items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-zinc-900 border-b">
                                    <tr>
                                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Nama Bahan Baku</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Sisa Stok</th>
                                        <th className="p-3 text-right font-semibold text-amber-700 dark:text-amber-500 bg-amber-50/50 dark:bg-amber-950/20 border-l">Qty Dibeli</th>
                                        <th className="p-3 text-right font-semibold text-amber-700 dark:text-amber-500 bg-amber-50/50 dark:bg-amber-950/20">Nilai Dibeli</th>
                                        <th className="p-3 text-right font-semibold text-emerald-700 dark:text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 border-l">Qty Digunakan</th>
                                        <th className="p-3 text-right font-semibold text-emerald-700 dark:text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20">Nilai Digunakan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredReports.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                Tidak ada data atau tidak ditemukan hasil pencarian.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredReports.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                                <td className="p-3">
                                                    <div className="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
                                                    <div className="text-xs text-muted-foreground">Satuan: {r.unit}</div>
                                                </td>
                                                <td className="p-3 text-right font-semibold">
                                                    {r.currentStock} {r.unit}
                                                </td>
                                                <td className="p-3 text-right text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10 border-l">
                                                    {r.purchasedQty > 0 ? `+${r.purchasedQty}` : '-'}
                                                </td>
                                                <td className="p-3 text-right text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10">
                                                    {r.purchasedValue > 0 ? formatIDR(r.purchasedValue) : '-'}
                                                </td>
                                                <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10 border-l">
                                                    {r.usedQty > 0 ? `-${r.usedQty}` : '-'}
                                                </td>
                                                <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
                                                    {r.usedValue > 0 ? formatIDR(r.usedValue) : '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
