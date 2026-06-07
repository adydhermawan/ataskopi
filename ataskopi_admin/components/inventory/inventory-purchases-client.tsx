"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import {
    getInventoryPurchases,
    createInventoryPurchase,
    deleteInventoryPurchase,
} from "@/actions/inventory-purchases";
import { getRawMaterials } from "@/actions/raw-materials";
import {
    Plus,
    Trash,
    Loader2,
    ShoppingCart,
    Info,
    Package,
    Calendar,
    Coins,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface RawMaterialOption {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    averageCost: number;
}

interface Purchase {
    id: string;
    outletId: string;
    rawMaterialId: string;
    date: Date;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    supplier: string | null;
    notes: string | null;
    rawMaterial: {
        id: string;
        name: string;
        unit: string;
    };
}

const PERIOD_OPTIONS = [
    { value: "this_month", label: "Bulan Ini" },
    { value: "last_month", label: "Bulan Lalu" },
    { value: "last_3_months", label: "3 Bulan Terakhir" },
    { value: "all", label: "Semua" },
];

export function InventoryPurchasesClient() {
    const { user } = useCurrentUser();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [outletId, setOutletId] = useState<string | null>(null);
    const [period, setPeriod] = useState("this_month");

    // Raw materials for dropdown
    const [rawMaterials, setRawMaterials] = useState<RawMaterialOption[]>([]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formDate, setFormDate] = useState("");
    const [formRawMaterialId, setFormRawMaterialId] = useState("");
    const [formQuantity, setFormQuantity] = useState("");
    const [formUnitPrice, setFormUnitPrice] = useState("");
    const [formTotalAmount, setFormTotalAmount] = useState("");
    const [formSupplier, setFormSupplier] = useState("");
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

    // Fetch raw materials when outlet changes
    const fetchMaterials = async () => {
        if (!outletId) return;
        try {
            const data = await getRawMaterials(outletId);
            setRawMaterials(
                data.map((m) => ({
                    id: m.id,
                    name: m.name,
                    unit: m.unit,
                    currentStock: Number(m.currentStock),
                    averageCost: Number(m.averageCost),
                }))
            );
        } catch (err) {
            console.error("Failed to fetch raw materials:", err);
        }
    };

    useEffect(() => {
        if (user && outletId) fetchMaterials();
    }, [user, outletId]);

    const getDateRange = () => {
        const now = new Date();
        switch (period) {
            case "this_month":
                return { start: startOfMonth(now), end: endOfMonth(now) };
            case "last_month":
                const lastMonth = subMonths(now, 1);
                return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
            case "last_3_months":
                return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
            default:
                return { start: undefined, end: undefined };
        }
    };

    const fetchPurchases = async () => {
        if (!outletId) return;
        setLoading(true);
        try {
            const { start, end } = getDateRange();
            const data = await getInventoryPurchases(outletId, start, end);
            setPurchases(data.map((p) => ({
                ...p,
                quantity: Number(p.quantity),
                unitPrice: Number(p.unitPrice),
                totalAmount: Number(p.totalAmount),
                date: new Date(p.date),
            })));
        } catch (err) {
            console.error("Failed to fetch purchases:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && outletId) fetchPurchases();
    }, [user, outletId, period]);

    const formatIDR = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalInventoryValue = rawMaterials.reduce((sum, m) => sum + (m.currentStock * m.averageCost), 0);

    const openCreateModal = () => {
        setFormDate(new Date().toLocaleDateString("en-CA"));
        setFormRawMaterialId("");
        setFormQuantity("");
        setFormUnitPrice("");
        setFormTotalAmount("");
        setFormSupplier("");
        setFormNotes("");
        setIsModalOpen(true);
    };

    const selectedMaterial = rawMaterials.find((m) => m.id === formRawMaterialId);

    // Auto-calculate unitPrice if totalAmount & quantity are filled
    const handleQuantityChange = (val: string) => {
        setFormQuantity(val);
        if (formTotalAmount && val && Number(val) > 0) {
            setFormUnitPrice((Number(formTotalAmount) / Number(val)).toFixed(2));
        } else if (formUnitPrice && val && Number(val) > 0) {
            setFormTotalAmount((Number(formUnitPrice) * Number(val)).toFixed(0));
        }
    };

    const handleUnitPriceChange = (val: string) => {
        setFormUnitPrice(val);
        if (formQuantity && val && Number(formQuantity) > 0) {
            setFormTotalAmount((Number(formQuantity) * Number(val)).toFixed(0));
        }
    };

    const handleTotalAmountChange = (val: string) => {
        setFormTotalAmount(val);
        if (formQuantity && val && Number(formQuantity) > 0) {
            setFormUnitPrice((Number(val) / Number(formQuantity)).toFixed(2));
        }
    };

    const handleFormSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!outletId || !formRawMaterialId || !formQuantity || !formTotalAmount) return;
        setFormSubmitting(true);
        try {
            const qty = Number(formQuantity);
            const total = Number(formTotalAmount);
            const unitPriceVal = Number(formUnitPrice) || (total / qty);

            const res = await createInventoryPurchase({
                outletId,
                rawMaterialId: formRawMaterialId,
                date: new Date(formDate + "T00:00:00Z"),
                quantity: qty,
                unitPrice: unitPriceVal,
                totalAmount: total,
                supplier: formSupplier || undefined,
                notes: formNotes || undefined,
            }) as any;

            if (res.success) {
                toast.success(res.message || "Pembelian bahan baku berhasil dicatat");
                setIsModalOpen(false);
                await fetchPurchases();
                await fetchMaterials(); // Refresh materials stock / averageCost
            } else {
                toast.error(res.error || "Gagal mencatat pembelian");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus catatan pembelian ini? Stok bahan baku akan dikurangi dan harga modal akan disesuaikan kembali.")) return;
        try {
            const res = await deleteInventoryPurchase(id) as any;
            if (res.success) {
                toast.success("Pembelian berhasil dihapus");
                await fetchPurchases();
                await fetchMaterials(); // Refresh materials stock / averageCost
            } else {
                toast.error(res.error || "Gagal menghapus");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        }
    };

    if (loading && !purchases.length) {
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
                        <span className="text-sm font-medium text-muted-foreground">Periode:</span>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            {PERIOD_OPTIONS.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <Button onClick={openCreateModal} className="w-full sm:w-auto flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" /> Catat Pembelian
                </Button>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pembelian Periode Ini</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{formatIDR(totalPurchases)}</div>
                        <p className="text-xs text-muted-foreground">Persediaan yang dibeli, belum terhitung COGS.</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nilai Persediaan Saat Ini (Asset)</CardTitle>
                        <Coins className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatIDR(totalInventoryValue)}</div>
                        <p className="text-xs text-muted-foreground">Perhitungan: Σ (Stok Aktual × Harga Modal Rata-rata).</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                    <CardTitle>Daftar Pembelian Bahan Baku</CardTitle>
                    <CardDescription>Catat masuknya persediaan bahan baku. Transaksi ini menambah stok dan memperbarui harga modal rata-rata.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm block md:table">
                            <thead className="bg-slate-50 dark:bg-zinc-900 border-b hidden md:table-header-group">
                                <tr>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Tanggal</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Bahan Baku</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Jumlah</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Harga / Unit</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Total Pembelian</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Supplier</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Keterangan</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y block md:table-row-group">
                                {purchases.length === 0 ? (
                                    <tr className="block md:table-row">
                                        <td colSpan={8} className="p-8 text-center text-muted-foreground block md:table-cell">
                                            Belum ada riwayat pembelian. Klik &quot;Catat Pembelian&quot; untuk mulai.
                                        </td>
                                    </tr>
                                ) : (
                                    purchases.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors block md:table-row border-b md:border-none p-4 md:p-0 space-y-3 md:space-y-0">
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell font-medium">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider">Tanggal</span>
                                                <span className="text-right md:text-left">{format(new Date(p.date), "dd MMM yyyy", { locale: idLocale })}</span>
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell font-semibold text-slate-900 dark:text-white">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider">Bahan Baku</span>
                                                <span className="text-right md:text-left">{p.rawMaterial?.name || "Bahan Baku"}</span>
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-right">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider text-left">Jumlah</span>
                                                <span>{p.quantity} {p.rawMaterial?.unit}</span>
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-right text-muted-foreground">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider text-left">Harga / Unit</span>
                                                <span>{formatIDR(p.unitPrice)}</span>
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-right font-bold text-slate-900 dark:text-white">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider text-left">Total Pembelian</span>
                                                <span>{formatIDR(p.totalAmount)}</span>
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-muted-foreground">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider">Supplier</span>
                                                <span className="text-right md:text-left">{p.supplier || "—"}</span>
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-muted-foreground">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider">Keterangan</span>
                                                <span className="max-w-[150px] md:max-w-xs truncate text-right md:text-left">{p.notes || "—"}</span>
                                            </td>
                                            <td className="p-0 md:p-3 flex justify-between items-center md:table-cell text-right pt-3 md:pt-3 border-t md:border-none mt-3 md:mt-0">
                                                <span className="md:hidden font-semibold text-slate-500 text-xs uppercase tracking-wider text-left">Aksi</span>
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
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
                title="Catat Pembelian Bahan Baku"
                description="Masukkan detail pembelian bahan baku untuk meningkatkan stok dan menyesuaikan harga modal."
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            >
                <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Tanggal Pembelian *</label>
                            <input
                                type="date"
                                required
                                value={formDate}
                                onChange={(e) => setFormDate(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Bahan Baku *</label>
                            <select
                                required
                                value={formRawMaterialId}
                                onChange={(e) => setFormRawMaterialId(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="">— Pilih Bahan Baku —</option>
                                {rawMaterials.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({m.unit}) — stok: {m.currentStock}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedMaterial && (
                        <div className="space-y-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">
                                        Jumlah Beli ({selectedMaterial.unit}) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0.01"
                                        step="0.01"
                                        placeholder="0"
                                        value={formQuantity}
                                        onChange={(e) => handleQuantityChange(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-white dark:bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Harga per unit *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        placeholder="0"
                                        value={formUnitPrice}
                                        onChange={(e) => handleUnitPriceChange(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-white dark:bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Total Harga (Rp) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder="0"
                                        value={formTotalAmount}
                                        onChange={(e) => handleTotalAmountChange(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-white dark:bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                            </div>

                            {/* Comparison and moving average explanation */}
                            <div className="space-y-1 pt-1 border-t border-blue-200/50 dark:border-blue-800/50">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Info className="h-3.5 w-3.5 text-blue-500" />
                                    <span>
                                        Harga modal rata-rata saat ini: <strong>{formatIDR(selectedMaterial.averageCost)}/{selectedMaterial.unit}</strong>
                                    </span>
                                </div>
                                {Number(formUnitPrice) > 0 && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <span className="text-muted-foreground">Perubahan harga:</span>
                                        {Number(formUnitPrice) > selectedMaterial.averageCost ? (
                                            <span className="text-red-500 font-semibold">
                                                Lebih mahal {((Number(formUnitPrice) - selectedMaterial.averageCost) / (selectedMaterial.averageCost || 1) * 100).toFixed(1)}% dari rata-rata
                                            </span>
                                        ) : Number(formUnitPrice) < selectedMaterial.averageCost ? (
                                            <span className="text-green-500 font-semibold">
                                                Lebih murah {((selectedMaterial.averageCost - Number(formUnitPrice)) / (selectedMaterial.averageCost || 1) * 100).toFixed(1)}% dari rata-rata
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">Sama dengan rata-rata</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Supplier (Opsional)</label>
                            <input
                                type="text"
                                placeholder="Contoh: Toko Kopi Utama"
                                value={formSupplier}
                                onChange={(e) => setFormSupplier(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Keterangan (Opsional)</label>
                            <input
                                type="text"
                                placeholder="Contoh: Biji kopi Toraja premium"
                                value={formNotes}
                                onChange={(e) => setFormNotes(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={formSubmitting}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={formSubmitting || !formRawMaterialId || !formQuantity || !formTotalAmount}>
                            {formSubmitting ? "Menyimpan..." : "Simpan Pembelian"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
