"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import { parsePrismaDecimal } from "@/lib/utils";

import {
    getStockOpnames,
    createStockOpname,
    updateStockOpnameStatus,
    deleteStockOpname,
    updateStockOpname,
} from "@/actions/stock-opname";
import { getRawMaterials } from "@/actions/raw-materials";
import {
    Plus,
    Trash,
    Loader2,
    ClipboardList,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    Edit,
    ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface RawMaterial {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    averageCost: number;
    packagingWeight?: number;
}

interface OpnameItemInput {
    rawMaterialId: string;
    name: string;
    unit: string;
    systemStock: number;
    actualStock: string;
    grossStock?: string;
    packagingWeight: number;
    unitCost: number;
}

interface StockOpnameData {
    id: string;
    date: Date;
    status: string;
    notes: string | null;
    items: Array<{
        id: string;
        rawMaterialId: string;
        systemStock: any;
        actualStock: any;
        difference: any;
        unitCost: any;
        rawMaterial: { name: string; unit: string; packagingWeight?: any };
    }>;
}

export function StockOpnameClient() {
    const { user } = useCurrentUser();
    const [opnames, setOpnames] = useState<StockOpnameData[]>([]);
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [outletId, setOutletId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Create modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formDate, setFormDate] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [opnameItems, setOpnameItems] = useState<OpnameItemInput[]>([]);
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [editingOpnameId, setEditingOpnameId] = useState<string | null>(null);
    const [editingOpnameStatus, setEditingOpnameStatus] = useState<string | null>(null);

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

    const fetchOpnames = async () => {
        if (!outletId) return;
        setLoading(true);
        try {
            const data = await getStockOpnames(outletId);
            setOpnames(data as any);
        } catch (err) {
            console.error("Failed to fetch opnames:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && outletId) fetchOpnames();
    }, [user, outletId]);

    const formatIDR = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    const openCreateModal = async () => {
        if (!outletId) return;
        // Load raw materials for this outlet
        try {
            const materials = await getRawMaterials(outletId);
            if (materials.length === 0) {
                toast.error("Belum ada bahan baku. Silakan tambahkan bahan baku terlebih dahulu.");
                return;
            }
            setOpnameItems(
                materials.map((m) => ({
                    rawMaterialId: m.id,
                    name: m.name,
                    unit: m.unit,
                    systemStock: parsePrismaDecimal(m.currentStock),
                    actualStock: parsePrismaDecimal(m.currentStock).toString(),
                    grossStock: "",
                    packagingWeight: parsePrismaDecimal(m.packagingWeight),
                    unitCost: parsePrismaDecimal(m.averageCost),
                }))
            );
            setFormDate(new Date().toLocaleDateString("en-CA"));
            setFormNotes("");
            setEditingOpnameId(null);
            setEditingOpnameStatus(null);
            setIsModalOpen(true);
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat data bahan baku");
        }
    };

    const openEditModal = (opname: StockOpnameData) => {
        setEditingOpnameId(opname.id);
        setEditingOpnameStatus(opname.status);
        setFormDate(new Date(opname.date).toLocaleDateString("en-CA"));
        setFormNotes(opname.notes || "");
        setOpnameItems(
            opname.items.map((item) => ({
                rawMaterialId: item.rawMaterialId,
                name: item.rawMaterial.name,
                unit: item.rawMaterial.unit,
                systemStock: parsePrismaDecimal(item.systemStock),
                actualStock: parsePrismaDecimal(item.actualStock).toString(),
                grossStock: "",
                packagingWeight: parsePrismaDecimal(item.rawMaterial.packagingWeight),
                unitCost: parsePrismaDecimal(item.unitCost),
            }))
        );
        setIsModalOpen(true);
    };

    const updateGrossStock = (index: number, value: string) => {
        setOpnameItems((prev) => {
            const updated = [...prev];
            updated[index].grossStock = value;
            if (value !== "") {
                const gross = Number(value) || 0;
                const net = Math.max(0, gross - updated[index].packagingWeight);
                updated[index].actualStock = net.toString();
            } else {
                updated[index].actualStock = updated[index].systemStock.toString();
            }
            return updated;
        });
    };

    const updateActualStock = (index: number, value: string) => {
        setOpnameItems((prev) => {
            const updated = [...prev];
            updated[index].actualStock = value;
            updated[index].grossStock = ""; // reset gross if actual is manually edited
            return updated;
        });
    };

    const handleSubmit = async (saveAsCompleted: boolean) => {
        if (!outletId) return;
        setFormSubmitting(true);
        try {
            const items = opnameItems.map((item) => {
                const actual = Number(item.actualStock) || 0;
                return {
                    rawMaterialId: item.rawMaterialId,
                    systemStock: item.systemStock,
                    actualStock: actual,
                    difference: actual - item.systemStock,
                    unitCost: item.unitCost,
                };
            });

            let res;
            if (editingOpnameId) {
                res = await updateStockOpname(editingOpnameId, {
                    date: new Date(formDate + "T00:00:00Z"),
                    status: saveAsCompleted ? "COMPLETED" : "DRAFT",
                    notes: formNotes || undefined,
                    items,
                });
            } else {
                res = await createStockOpname({
                    outletId,
                    date: new Date(formDate + "T00:00:00Z"),
                    status: saveAsCompleted ? "COMPLETED" : "DRAFT",
                    notes: formNotes || undefined,
                    items,
                });
            }

            if (res.success) {
                toast.success(saveAsCompleted ? "Stock opname selesai! Stok bahan baku telah diperbarui." : "Stock opname berhasil disimpan.");
                setIsModalOpen(false);
                setEditingOpnameId(null);
                setEditingOpnameStatus(null);
                await fetchOpnames();
            } else {
                toast.error(res.error || "Gagal menyimpan stock opname");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleComplete = async (id: string) => {
        if (!confirm("Setelah stock opname diselesaikan, stok bahan baku akan diperbarui sesuai stok aktual. Lanjutkan?")) return;
        try {
            const res = await updateStockOpnameStatus(id, "COMPLETED");
            if (res.success) {
                toast.success("Stock opname selesai! Stok bahan baku diperbarui.");
                await fetchOpnames();
            } else {
                toast.error(res.error || "Gagal menyelesaikan stock opname");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        }
    };

    const handleDelete = async (opname: StockOpnameData) => {
        const msg = opname.status === "COMPLETED"
            ? "Menghapus stock opname yang sudah SELESAI akan mengembalikan penyesuaian stok bahan baku. Lanjutkan?"
            : "Hapus draft stock opname ini?";
        if (!confirm(msg)) return;
        try {
            const res = await deleteStockOpname(opname.id);
            if (res.success) {
                toast.success("Stock opname berhasil dihapus");
                await fetchOpnames();
            } else {
                toast.error(res.error || "Gagal menghapus");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        }
    };

    if (loading && !opnames.length) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isModalOpen) {
        return (
            <div className="space-y-6 pb-20">
                <div className="flex items-center gap-4">
                    <Button onClick={() => setIsModalOpen(false)} variant="outline" size="icon" className="h-8 w-8 rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-xl font-bold tracking-tight">{editingOpnameId ? "Edit Stock Opname" : "Mulai Stock Opname"}</h2>
                </div>
                
                <Card className="border shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle>{editingOpnameId ? "Edit Perhitungan" : "Perhitungan Stok Fisik"}</CardTitle>
                        <CardDescription>
                            {editingOpnameId ? "Ubah perhitungan fisik stok bahan baku." : "Hitung stok fisik bahan baku. Masukkan stok aktual untuk setiap item."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {editingOpnameStatus === "COMPLETED" && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-amber-800 dark:text-amber-300 text-xs">
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500 animate-pulse" />
                                <div>
                                    <span className="font-semibold">Perhatian:</span> Stock opname ini sudah selesai. 
                                    Menyimpan perubahan akan menyesuaikan stok bahan baku saat ini secara otomatis berdasarkan perbedaan nilai aktual yang baru.
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Tanggal</label>
                                <input
                                    type="date"
                                    required
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Catatan (Opsional)</label>
                                <input
                                    type="text"
                                    placeholder="Misal: Opname mingguan"
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                        </div>

                        {/* List of items as cards for mobile friendliness */}
                        <div className="space-y-3 mt-6">
                            <h3 className="text-sm font-semibold mb-2">Item Bahan Baku</h3>
                            {opnameItems.map((item, idx) => {
                                const actual = Number(item.actualStock) || 0;
                                const diff = actual - item.systemStock;
                                return (
                                    <div key={item.rawMaterialId} className="p-4 rounded-lg border bg-slate-50/50 dark:bg-zinc-900/50 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-semibold text-sm">{item.name}</div>
                                                <div className="text-xs text-muted-foreground">Satuan: {item.unit}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-muted-foreground">Stok Sistem</div>
                                                <div className="font-medium">{item.systemStock}</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-start border-t pt-3 mt-1">
                                            <div>
                                                <label className="text-[10px] sm:text-xs font-medium mb-1 block leading-tight">Timbangan Kotor</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder={item.packagingWeight > 0 ? "Kotor" : "-"}
                                                    disabled={item.packagingWeight === 0}
                                                    value={item.grossStock ?? ""}
                                                    onChange={(e) => updateGrossStock(idx, e.target.value)}
                                                    className="w-full h-9 text-sm rounded border border-input bg-white dark:bg-zinc-950 px-2 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                                {item.packagingWeight > 0 && <div className="text-[10px] text-muted-foreground mt-1">Wdh: {item.packagingWeight}</div>}
                                            </div>
                                            <div>
                                                <label className="text-[10px] sm:text-xs font-medium mb-1 block leading-tight">Stok Aktual (Net)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={item.actualStock}
                                                    onChange={(e) => updateActualStock(idx, e.target.value)}
                                                    className="w-full h-9 text-sm rounded border border-input bg-white dark:bg-zinc-950 px-2 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                />
                                            </div>
                                            <div className="text-right pb-1">
                                                <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 leading-tight">Selisih</div>
                                                <div className={`text-sm sm:text-base font-bold mt-1 ${diff < 0 ? "text-red-600" : diff > 0 ? "text-emerald-600" : ""}`}>
                                                    {diff !== 0 ? (diff > 0 ? "+" : "") + diff.toFixed(2) : "0"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row justify-end gap-3 fixed sm:sticky bottom-0 left-0 right-0 z-10 bg-white dark:bg-zinc-950 border-t p-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.1)] sm:shadow-none sm:border sm:rounded-xl sm:bg-white/80 sm:backdrop-blur-md">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={formSubmitting} className="w-full sm:w-auto">
                        Batal
                    </Button>
                    <Button type="button" variant="outline" onClick={() => handleSubmit(false)} disabled={formSubmitting} className="w-full sm:w-auto">
                        {formSubmitting ? "Menyimpan..." : "Simpan Draft"}
                    </Button>
                    <Button type="button" onClick={() => handleSubmit(true)} disabled={formSubmitting} className="w-full sm:w-auto">
                        {formSubmitting ? "Menyimpan..." : "Selesaikan & Update Stok"}
                    </Button>
                </div>
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
                    ) : (
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Outlet: {outlets.find((o) => o.id === outletId)?.name || "—"}
                        </div>
                    )}
                </div>
                <Button onClick={openCreateModal} className="w-full sm:w-auto flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" /> Mulai Stock Opname
                </Button>
            </div>

            {/* Table */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                    <CardTitle>Riwayat Stock Opname</CardTitle>
                    <CardDescription>Catat dan pantau perhitungan fisik stok bahan baku.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm block md:table">
                            <thead className="bg-slate-50 dark:bg-zinc-900 border-b hidden md:table-header-group">
                                <tr>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300 w-8"></th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Tanggal</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Catatan</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Item</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">COGS (HPP)</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y block md:table-row-group">
                                {opnames.length === 0 ? (
                                    <tr className="block md:table-row">
                                        <td colSpan={7} className="p-8 text-center text-muted-foreground block md:table-cell">
                                            Belum ada riwayat stock opname. Klik "Mulai Stock Opname" untuk memulai.
                                        </td>
                                    </tr>
                                ) : (
                                    opnames.map((o) => {
                                        const cogsAmountVal = Number((o as any).cogsAmount) || o.items.reduce((sum, item) => {
                                            const diff = Number(item.difference);
                                            return diff < 0 ? sum + Math.abs(diff) * Number(item.unitCost) : sum;
                                        }, 0);
                                        const isExpanded = expandedId === o.id;
 
                                        return (
                                            <React.Fragment key={o.id}>
                                                <tr className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer block md:table-row border-b md:border-none p-4 md:p-0 space-y-3 md:space-y-0" onClick={() => setExpandedId(isExpanded ? null : o.id)}>
                                                    <td className="p-0 md:p-3 flex justify-between items-center md:table-cell">
                                                        <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider">Detail</span>
                                                        <span className="text-right md:text-left">{isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</span>
                                                    </td>
                                                    <td className="p-0 md:p-3 flex justify-between items-center md:table-cell font-medium">
                                                        <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider">Tanggal</span>
                                                        <span className="text-right md:text-left">{format(new Date(o.date), "dd MMMM yyyy", { locale: idLocale })}</span>
                                                    </td>
                                                    <td className="p-0 md:p-3 flex justify-between items-center md:table-cell">
                                                        <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</span>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium text-right md:text-left ${o.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                                            {o.status === "COMPLETED" ? "Selesai" : "Draft"}
                                                        </span>
                                                    </td>
                                                    <td className="p-0 md:p-3 flex justify-between items-center md:table-cell">
                                                        <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider">Catatan</span>
                                                        <span className="text-muted-foreground text-right md:text-left">{o.notes || "—"}</span>
                                                    </td>
                                                    <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-right font-medium">
                                                        <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider text-left">Item</span>
                                                        <span>{o.items.length}</span>
                                                    </td>
                                                    <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-right font-bold text-red-600">
                                                        <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider text-left">COGS (HPP)</span>
                                                        <span>{formatIDR(cogsAmountVal)}</span>
                                                    </td>
                                                    <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-right pt-3 md:pt-3 border-t md:border-none mt-3 md:mt-0" onClick={(e) => e.stopPropagation()}>
                                                        <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider text-left">Aksi</span>
                                                        <div className="flex justify-end gap-1">
                                                            {o.status === "DRAFT" && (
                                                                <Button variant="ghost" size="sm" onClick={() => handleComplete(o.id)} className="h-8 px-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 text-xs gap-1">
                                                                    <CheckCircle className="h-3 w-3" /> Selesaikan
                                                                </Button>
                                                            )}
                                                            <Button variant="ghost" size="sm" onClick={() => openEditModal(o)} className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(o)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                                                <Trash className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="block md:table-row">
                                                        <td colSpan={7} className="p-0 block md:table-cell">
                                                            <div className="bg-slate-50/70 dark:bg-zinc-900/50 p-4 border-t">
                                                                <table className="w-full text-xs block md:table">
                                                                    <thead className="hidden md:table-header-group">
                                                                        <tr className="text-muted-foreground">
                                                                            <th className="text-left pb-2 font-medium">Bahan Baku</th>
                                                                            <th className="text-right pb-2 font-medium">Stok Sistem</th>
                                                                            <th className="text-right pb-2 font-medium">Stok Aktual</th>
                                                                            <th className="text-right pb-2 font-medium">Selisih</th>
                                                                            <th className="text-right pb-2 font-medium">Harga Modal</th>
                                                                            <th className="text-right pb-2 font-medium">COGS (HPP)</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 block md:table-row-group">
                                                                        {o.items.map((item) => {
                                                                            const diff = Number(item.difference);
                                                                            const cogsItemVal = Number((item as any).cogsValue) || (diff < 0 ? Math.abs(diff) * Number(item.unitCost) : 0);
                                                                            return (
                                                                                <tr key={item.id} className="block md:table-row border-b md:border-none py-2 md:py-0 space-y-1 md:space-y-0">
                                                                                    <td className="flex justify-between items-center md:table-cell py-1 md:py-2 font-medium">
                                                                                        <span className="md:hidden text-muted-foreground">Bahan Baku</span>
                                                                                        <span className="text-right md:text-left">{item.rawMaterial.name} ({item.rawMaterial.unit})</span>
                                                                                    </td>
                                                                                    <td className="flex justify-between items-center md:table-cell py-1 md:py-2 text-right">
                                                                                        <span className="md:hidden text-muted-foreground text-left">Stok Sistem</span>
                                                                                        <span>{Number(item.systemStock)}</span>
                                                                                    </td>
                                                                                    <td className="flex justify-between items-center md:table-cell py-1 md:py-2 text-right font-medium">
                                                                                        <span className="md:hidden text-muted-foreground text-left">Stok Aktual</span>
                                                                                        <span>{Number(item.actualStock)}</span>
                                                                                    </td>
                                                                                    <td className={`flex justify-between items-center md:table-cell py-1 md:py-2 text-right font-bold ${diff < 0 ? "text-red-600" : diff > 0 ? "text-emerald-600" : ""}`}>
                                                                                        <span className="md:hidden text-muted-foreground text-left">Selisih</span>
                                                                                        <span>{diff > 0 ? "+" : ""}{diff}</span>
                                                                                    </td>
                                                                                    <td className="flex justify-between items-center md:table-cell py-1 md:py-2 text-right">
                                                                                        <span className="md:hidden text-muted-foreground text-left">Harga Modal</span>
                                                                                        <span>{formatIDR(Number(item.unitCost))}</span>
                                                                                    </td>
                                                                                    <td className={`flex justify-between items-center md:table-cell py-1 md:py-2 text-right font-bold ${cogsItemVal > 0 ? "text-red-600" : ""}`}>
                                                                                        <span className="md:hidden text-muted-foreground text-left">COGS (HPP)</span>
                                                                                        <span>{formatIDR(cogsItemVal)}</span>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
