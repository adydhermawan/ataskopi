"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import { updateAsset, deleteAsset } from "@/actions/assets";
import { getAssetsROI } from "@/actions/analytics";
import {
    Edit,
    Trash,
    Loader2,
    Wallet,
    TrendingUp,
    BadgeDollarSign,
    Clock,
    BookOpen,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const USEFUL_LIFE_OPTIONS = [
    { value: 3, label: "3 Bulan" },
    { value: 6, label: "6 Bulan" },
    { value: 12, label: "12 Bulan (1 Tahun)" },
    { value: 24, label: "24 Bulan (2 Tahun)" },
    { value: 36, label: "36 Bulan (3 Tahun)" },
    { value: 48, label: "48 Bulan (4 Tahun)" },
    { value: 60, label: "60 Bulan (5 Tahun)" },
];

interface AssetROI {
    id: string;
    outletId: string;
    name: string;
    purchaseDate: Date;
    purchasePrice: number;
    usefulLifeMonths: number;
    monthlyDepreciation: number;
    accumulatedDepreciation: number;
    bookValue: number;
    status: string;
    notes: string | null;
    netProfitSince: number;
    roiPercentage: number;
}

export function AssetsClient() {
    const { user } = useCurrentUser();
    const [assets, setAssets] = useState<AssetROI[]>([]);
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [outletId, setOutletId] = useState<string | null>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AssetROI | null>(null);
    const [formName, setFormName] = useState("");
    const [formDate, setFormDate] = useState("");
    const [formPrice, setFormPrice] = useState("");
    const [formUsefulLife, setFormUsefulLife] = useState(12);
    const [formStatus, setFormStatus] = useState("ACTIVE");
    const [formNotes, setFormNotes] = useState("");
    const [formSubmitting, setFormSubmitting] = useState(false);

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

    const fetchAssets = async () => {
        if (!outletId) return;
        setLoading(true);
        try {
            const data = await getAssetsROI(outletId);
            setAssets(data as AssetROI[]);
        } catch (err) {
            console.error("Failed to fetch assets:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && outletId) fetchAssets();
    }, [user, outletId]);

    const formatIDR = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    const totalInvestment = assets.reduce((sum, a) => sum + Number(a.purchasePrice), 0);
    const totalBookValue = assets.reduce((sum, a) => sum + a.bookValue, 0);
    const totalNetProfit = assets.length > 0 ? assets[0].netProfitSince : 0;
    const overallROI = totalInvestment > 0 ? (totalNetProfit / totalInvestment) * 100 : 0;

    const getDepreciationStatus = (a: AssetROI) => {
        const now = new Date();
        const purchaseDate = new Date(a.purchaseDate);
        const monthsElapsed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
        if (monthsElapsed >= a.usefulLifeMonths) {
            return { label: "Habis Disusutkan", color: "bg-slate-100 text-slate-600" };
        }
        return { label: "Menyusut", color: "bg-amber-100 text-amber-700" };
    };

    const openEditModal = (a: AssetROI) => {
        setEditingItem(a);
        setFormName(a.name);
        setFormDate(format(new Date(a.purchaseDate), "yyyy-MM-dd"));
        setFormPrice(Number(a.purchasePrice).toString());
        setFormUsefulLife(a.usefulLifeMonths);
        setFormStatus(a.status);
        setFormNotes(a.notes || "");
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!outletId || !editingItem) return;
        setFormSubmitting(true);
        try {
            const res = await updateAsset(editingItem.id, {
                name: formName,
                purchaseDate: new Date(formDate + "T00:00:00Z"),
                purchasePrice: Number(formPrice),
                usefulLifeMonths: formUsefulLife,
                status: formStatus,
                notes: formNotes || undefined,
            });
            if (res.success) {
                toast.success("Aset berhasil diperbarui");
                setIsModalOpen(false);
                await fetchAssets();
            } else {
                toast.error(res.error || "Gagal menyimpan aset");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus aset ini? Data penyusutan terkait juga akan dihapus dari laporan.")) return;
        try {
            const res = await deleteAsset(id);
            if (res.success) {
                toast.success("Aset berhasil dihapus");
                await fetchAssets();
            } else {
                toast.error(res.error || "Gagal menghapus");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        }
    };

    if (loading && !assets.length) {
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
                <div className="flex items-center gap-3">
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
                <div className="text-sm text-muted-foreground">
                    Tambahkan aset baru lewat menu <strong>Kas Keluar</strong> → Pembelian Aset
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Investasi Aset</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatIDR(totalInvestment)}</div>
                        <p className="text-xs text-muted-foreground">{assets.length} aset aktif (harga beli)</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nilai Buku Saat Ini</CardTitle>
                        <BookOpen className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-600">{formatIDR(totalBookValue)}</div>
                        <p className="text-xs text-muted-foreground">Setelah penyusutan</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit Terkumpul</CardTitle>
                        <BadgeDollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${totalNetProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {formatIDR(totalNetProfit)}
                        </div>
                        <p className="text-xs text-muted-foreground">Sejak aset pertama dibeli</p>
                    </CardContent>
                </Card>
                <Card className={`border-l-4 shadow-sm ${overallROI >= 100 ? "border-l-emerald-500" : "border-l-amber-500"}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overall ROI</CardTitle>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${overallROI >= 100 ? "text-emerald-600" : "text-amber-600"}`}>
                            {overallROI.toFixed(1)}%
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                            <div
                                className={`h-full transition-all ${overallROI >= 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                                style={{ width: `${Math.min(100, Math.max(0, overallROI))}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {overallROI >= 100 ? "🎉 Balik modal tercapai!" : `${(100 - overallROI).toFixed(1)}% lagi menuju balik modal`}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                    <CardTitle>Daftar Aset (Capital Expenditure)</CardTitle>
                    <CardDescription>Pantau penyusutan dan progres balik modal dari setiap aset.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-zinc-900 border-b">
                                <tr>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Nama Aset</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Tgl Beli</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Harga Beli</th>
                                    <th className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">Masa Manfaat</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Susut/Bulan</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Nilai Buku</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">ROI</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {assets.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-muted-foreground">
                                            Belum ada catatan aset. Tambahkan aset baru lewat menu <strong>Kas Keluar</strong>.
                                        </td>
                                    </tr>
                                ) : (
                                    assets.map((a) => {
                                        const depStatus = getDepreciationStatus(a);
                                        return (
                                            <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                                <td className="p-3">
                                                    <div className="font-medium">{a.name}</div>
                                                    {a.notes && <div className="text-xs text-muted-foreground">{a.notes}</div>}
                                                </td>
                                                <td className="p-3 text-xs">
                                                    {format(new Date(a.purchaseDate), "dd MMM yy", { locale: idLocale })}
                                                </td>
                                                <td className="p-3 text-right font-medium">{formatIDR(Number(a.purchasePrice))}</td>
                                                <td className="p-3 text-center">
                                                    <span className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        {a.usefulLifeMonths} bln
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right text-xs font-medium text-amber-600">
                                                    {formatIDR(a.monthlyDepreciation)}
                                                </td>
                                                <td className="p-3 text-right font-medium text-indigo-600">
                                                    {formatIDR(a.bookValue)}
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${depStatus.color}`}>
                                                        {depStatus.label}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${a.roiPercentage >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                                                                style={{ width: `${Math.min(100, Math.max(0, a.roiPercentage))}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-semibold w-12 text-right">
                                                            {a.roiPercentage.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="sm" onClick={() => openEditModal(a)} className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Modal */}
            <Modal
                title="Edit Aset"
                description="Perbarui data aset dan parameter penyusutan."
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            >
                <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Nama Aset *</label>
                        <input
                            type="text"
                            required
                            placeholder="Contoh: Mesin Espresso"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Tanggal Beli *</label>
                            <input
                                type="date"
                                required
                                value={formDate}
                                onChange={(e) => setFormDate(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Harga Beli (Rp) *</label>
                            <input
                                type="number"
                                required
                                min="0"
                                placeholder="5000000"
                                value={formPrice}
                                onChange={(e) => setFormPrice(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Masa Manfaat *</label>
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
                            {formPrice && formUsefulLife > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Penyusutan/bulan: <strong>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(formPrice) / formUsefulLife)}</strong>
                                </p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                value={formStatus}
                                onChange={(e) => setFormStatus(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="ACTIVE">Aktif</option>
                                <option value="RETIRED">Non-aktif / Rusak</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Catatan (Opsional)</label>
                        <textarea
                            placeholder="Misal: Mesin espresso Breville 2-head"
                            value={formNotes}
                            onChange={(e) => setFormNotes(e.target.value)}
                            rows={2}
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={formSubmitting}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={formSubmitting}>
                            {formSubmitting ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
