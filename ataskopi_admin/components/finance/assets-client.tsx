"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import { createAsset, updateAsset, deleteAsset } from "@/actions/assets";
import { getAssetsROI } from "@/actions/analytics";
import {
    Plus,
    Edit,
    Trash,
    Loader2,
    Wallet,
    TrendingUp,
    BadgeDollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface AssetROI {
    id: string;
    outletId: string;
    name: string;
    purchaseDate: Date;
    purchasePrice: any;
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
    const totalNetProfit = assets.length > 0 ? assets[0].netProfitSince : 0; // All assets share the same outlet net profit
    const overallROI = totalInvestment > 0 ? (totalNetProfit / totalInvestment) * 100 : 0;

    const openCreateModal = () => {
        setEditingItem(null);
        setFormName("");
        setFormDate(new Date().toLocaleDateString("en-CA"));
        setFormPrice("");
        setFormStatus("ACTIVE");
        setFormNotes("");
        setIsModalOpen(true);
    };

    const openEditModal = (a: AssetROI) => {
        setEditingItem(a);
        setFormName(a.name);
        setFormDate(format(new Date(a.purchaseDate), "yyyy-MM-dd"));
        setFormPrice(Number(a.purchasePrice).toString());
        setFormStatus(a.status);
        setFormNotes(a.notes || "");
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!outletId) return;
        setFormSubmitting(true);
        try {
            let res;
            if (editingItem) {
                res = await updateAsset(editingItem.id, {
                    name: formName,
                    purchaseDate: new Date(formDate + "T00:00:00Z"),
                    purchasePrice: Number(formPrice),
                    status: formStatus,
                    notes: formNotes || undefined,
                });
            } else {
                res = await createAsset({
                    outletId,
                    name: formName,
                    purchaseDate: new Date(formDate + "T00:00:00Z"),
                    purchasePrice: Number(formPrice),
                    status: formStatus,
                    notes: formNotes || undefined,
                });
            }
            if (res.success) {
                toast.success(editingItem ? "Aset berhasil diperbarui" : "Aset berhasil ditambahkan");
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
        if (!confirm("Hapus aset ini?")) return;
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
                <Button onClick={openCreateModal} className="w-full sm:w-auto flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" /> Tambah Aset
                </Button>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Investasi Aset</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatIDR(totalInvestment)}</div>
                        <p className="text-xs text-muted-foreground">{assets.length} aset aktif</p>
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
                    <CardDescription>Pantau progres balik modal dari setiap aset.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-zinc-900 border-b">
                                <tr>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Nama Aset</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Tanggal Beli</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Harga Beli</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Progres ROI</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {assets.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            Belum ada catatan aset. Klik "Tambah Aset" untuk mulai.
                                        </td>
                                    </tr>
                                ) : (
                                    assets.map((a) => (
                                        <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                            <td className="p-3">
                                                <div className="font-medium">{a.name}</div>
                                                {a.notes && <div className="text-xs text-muted-foreground">{a.notes}</div>}
                                            </td>
                                            <td className="p-3">
                                                {format(new Date(a.purchaseDate), "dd MMM yyyy", { locale: idLocale })}
                                            </td>
                                            <td className="p-3 text-right font-medium">{formatIDR(Number(a.purchasePrice))}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                                                    {a.status === "ACTIVE" ? "Aktif" : "Non-aktif"}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${a.roiPercentage >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                                                            style={{ width: `${Math.min(100, Math.max(0, a.roiPercentage))}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-semibold w-12 text-right">
                                                        {a.roiPercentage.toFixed(1)}%
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal */}
            <Modal
                title={editingItem ? "Edit Aset" : "Tambah Aset"}
                description={editingItem ? "Perbarui data aset." : "Catat pembelian aset / alat pendukung baru."}
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
                    {editingItem && (
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
                    )}
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
