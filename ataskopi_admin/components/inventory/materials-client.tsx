"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import {
    getRawMaterials,
    createRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
} from "@/actions/raw-materials";
import {
    Plus,
    Edit,
    Trash,
    Loader2,
    Package,
} from "lucide-react";

interface RawMaterial {
    id: string;
    outletId: string;
    name: string;
    sku: string | null;
    unit: string;
    currentStock: number;
    averageCost: number;
}

export function MaterialsClient() {
    const { user } = useCurrentUser();
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [outletId, setOutletId] = useState<string | null>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RawMaterial | null>(null);
    const [formName, setFormName] = useState("");
    const [formSku, setFormSku] = useState("");
    const [formUnit, setFormUnit] = useState("gram");
    const [formStock, setFormStock] = useState("");
    const [formCost, setFormCost] = useState("");
    const [formSubmitting, setFormSubmitting] = useState(false);

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

    // Fetch materials
    useEffect(() => {
        async function fetchMaterials() {
            if (!outletId) return;
            setLoading(true);
            try {
                const data = await getRawMaterials(outletId);
                setMaterials(
                    data.map((m) => ({
                        ...m,
                        currentStock: Number(m.currentStock),
                        averageCost: Number(m.averageCost),
                    }))
                );
            } catch (err) {
                console.error("Failed to fetch materials:", err);
            } finally {
                setLoading(false);
            }
        }
        if (user && outletId) fetchMaterials();
    }, [user, outletId]);

    const formatIDR = (val: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(val);

    const openCreateModal = () => {
        setEditingItem(null);
        setFormName("");
        setFormSku("");
        setFormUnit("gram");
        setFormStock("");
        setFormCost("");
        setIsModalOpen(true);
    };

    const openEditModal = (m: RawMaterial) => {
        setEditingItem(m);
        setFormName(m.name);
        setFormSku(m.sku || "");
        setFormUnit(m.unit);
        setFormStock(m.currentStock.toString());
        setFormCost(m.averageCost.toString());
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!outletId) return;
        setFormSubmitting(true);
        try {
            let res;
            if (editingItem) {
                res = await updateRawMaterial(editingItem.id, {
                    name: formName,
                    sku: formSku || undefined,
                    unit: formUnit,
                    currentStock: Number(formStock),
                    averageCost: Number(formCost),
                });
            } else {
                res = await createRawMaterial({
                    outletId,
                    name: formName,
                    sku: formSku || undefined,
                    unit: formUnit,
                    currentStock: Number(formStock) || 0,
                    averageCost: Number(formCost) || 0,
                });
            }
            if (res.success) {
                toast.success(editingItem ? "Bahan baku berhasil diperbarui" : "Bahan baku berhasil ditambahkan");
                setIsModalOpen(false);
                // Re-fetch
                const data = await getRawMaterials(outletId);
                setMaterials(data.map((m) => ({ ...m, currentStock: Number(m.currentStock), averageCost: Number(m.averageCost) })));
            } else {
                toast.error(res.error || "Gagal menyimpan bahan baku");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus bahan baku ini?")) return;
        if (!outletId) return;
        try {
            const res = await deleteRawMaterial(id);
            if (res.success) {
                toast.success("Bahan baku berhasil dihapus");
                const data = await getRawMaterials(outletId);
                setMaterials(data.map((m) => ({ ...m, currentStock: Number(m.currentStock), averageCost: Number(m.averageCost) })));
            } else {
                toast.error(res.error || "Gagal menghapus");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        }
    };

    if (loading && !materials.length) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const totalValue = materials.reduce((sum, m) => sum + m.currentStock * m.averageCost, 0);

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
                    <Plus className="h-4 w-4" /> Tambah Bahan Baku
                </Button>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Jenis Bahan Baku</CardTitle>
                        <Package className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{materials.length} item</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estimasi Nilai Stok</CardTitle>
                        <Package className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{formatIDR(totalValue)}</div>
                        <p className="text-xs text-muted-foreground">Stok × Harga Modal Rata-rata</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                    <CardTitle>Daftar Bahan Baku</CardTitle>
                    <CardDescription>Kelola stok dan harga bahan baku Anda.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-zinc-900 border-b">
                                <tr>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Nama</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">SKU</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Satuan</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Stok</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Harga Modal</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {materials.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            Belum ada data bahan baku. Klik "Tambah Bahan Baku" untuk mulai.
                                        </td>
                                    </tr>
                                ) : (
                                    materials.map((m) => (
                                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                            <td className="p-3 font-medium">{m.name}</td>
                                            <td className="p-3 text-muted-foreground">{m.sku || "—"}</td>
                                            <td className="p-3">{m.unit}</td>
                                            <td className="p-3 text-right font-bold">{m.currentStock}</td>
                                            <td className="p-3 text-right">{formatIDR(m.averageCost)}</td>
                                            <td className="p-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => openEditModal(m)} className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
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
                title={editingItem ? "Edit Bahan Baku" : "Tambah Bahan Baku"}
                description={editingItem ? "Perbarui data bahan baku." : "Masukkan data bahan baku baru."}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            >
                <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Nama Bahan Baku *</label>
                        <input
                            type="text"
                            required
                            placeholder="Contoh: Biji Kopi Arabika"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">SKU (Opsional)</label>
                            <input
                                type="text"
                                placeholder="Contoh: BB-001"
                                value={formSku}
                                onChange={(e) => setFormSku(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Satuan *</label>
                            <select
                                required
                                value={formUnit}
                                onChange={(e) => setFormUnit(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="gram">gram</option>
                                <option value="kg">kg</option>
                                <option value="ml">ml</option>
                                <option value="liter">liter</option>
                                <option value="pcs">pcs</option>
                                <option value="pack">pack</option>
                                <option value="botol">botol</option>
                                <option value="sachet">sachet</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Stok Awal</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                value={formStock}
                                onChange={(e) => setFormStock(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Harga Modal per Satuan (Rp)</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={formCost}
                                onChange={(e) => setFormCost(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
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
