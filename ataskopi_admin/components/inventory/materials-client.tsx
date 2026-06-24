"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import { parsePrismaDecimal } from "@/lib/utils";

import {
    getRawMaterials,
    createRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
    getRawMaterialPurchaseHistory,
    getStockProjections,
} from "@/actions/raw-materials";
import type { StockProjection } from "@/actions/raw-materials";
import {
    Plus,
    Edit,
    Trash,
    Loader2,
    Package,
    History,
    AlertTriangle,
    TrendingDown,
    ShieldCheck,
    Info,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface RawMaterial {
    id: string;
    outletId: string;
    name: string;
    sku: string | null;
    unit: string;
    currentStock: number;
    averageCost: number;
    packagingWeight: number;
}

interface PurchaseHistoryItem {
    id: string;
    date: Date;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    supplier: string | null;
    notes: string | null;
}

// Status priority for sorting (lower = more critical = comes first)
const STATUS_PRIORITY: Record<StockProjection['status'], number> = {
    'HABIS': 0,
    'KRITIS': 1,
    'SEGERA_BELI': 2,
    'PERHATIKAN': 3,
    'AMAN': 4,
    'NO_DATA': 5,
};

function ProjectionBadge({ projection }: { projection: StockProjection | undefined }) {
    if (!projection) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Info className="h-3 w-3" />
                Memuat...
            </span>
        );
    }

    const configs: Record<StockProjection['status'], {
        label: string;
        bgClass: string;
        textClass: string;
        dotClass: string;
        icon?: React.ReactNode;
    }> = {
        'HABIS': {
            label: 'HABIS',
            bgClass: 'bg-red-100 dark:bg-red-950/50',
            textClass: 'text-red-700 dark:text-red-400',
            dotClass: 'bg-red-500',
            icon: <AlertTriangle className="h-3 w-3" />,
        },
        'KRITIS': {
            label: `~${projection.projectedDays} hari`,
            bgClass: 'bg-red-100 dark:bg-red-950/50',
            textClass: 'text-red-700 dark:text-red-400',
            dotClass: 'bg-red-500 animate-pulse',
            icon: <AlertTriangle className="h-3 w-3" />,
        },
        'SEGERA_BELI': {
            label: `~${projection.projectedDays} hari`,
            bgClass: 'bg-amber-100 dark:bg-amber-950/50',
            textClass: 'text-amber-700 dark:text-amber-400',
            dotClass: 'bg-amber-500',
            icon: <TrendingDown className="h-3 w-3" />,
        },
        'PERHATIKAN': {
            label: `~${projection.projectedDays} hari`,
            bgClass: 'bg-orange-100 dark:bg-orange-950/50',
            textClass: 'text-orange-700 dark:text-orange-400',
            dotClass: 'bg-orange-500',
        },
        'AMAN': {
            label: `~${projection.projectedDays} hari`,
            bgClass: 'bg-emerald-100 dark:bg-emerald-950/50',
            textClass: 'text-emerald-700 dark:text-emerald-400',
            dotClass: 'bg-emerald-500',
            icon: <ShieldCheck className="h-3 w-3" />,
        },
        'NO_DATA': {
            label: 'Data belum cukup',
            bgClass: 'bg-slate-100 dark:bg-zinc-800',
            textClass: 'text-slate-500 dark:text-slate-400',
            dotClass: 'bg-slate-400',
            icon: <Info className="h-3 w-3" />,
        },
    };

    const config = configs[projection.status];

    return (
        <div className="flex flex-col items-end md:items-start gap-1">
            <span className={`inline-flex items-center gap-1.5 rounded-full ${config.bgClass} px-2.5 py-1 text-xs font-semibold ${config.textClass}`}>
                {config.icon || <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />}
                {config.label}
            </span>
            {projection.avgDailyUsage > 0 && (
                <span className="text-[10px] text-muted-foreground">
                    ~{projection.avgDailyUsage}/{projection.opnameCount > 0 ? 'hari aktif' : 'hari'}
                </span>
            )}
        </div>
    );
}

export function MaterialsClient() {
    const { user } = useCurrentUser();
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [projections, setProjections] = useState<Record<string, StockProjection>>({});
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [outletId, setOutletId] = useState<string | null>(null);

    // Form Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RawMaterial | null>(null);
    const [formName, setFormName] = useState("");
    const [formSku, setFormSku] = useState("");
    const [formUnit, setFormUnit] = useState("gram");
    const [formStock, setFormStock] = useState("");
    const [formCost, setFormCost] = useState("");
    const [formTotalCost, setFormTotalCost] = useState("");
    const [formPackagingWeight, setFormPackagingWeight] = useState("");
    const [formSubmitting, setFormSubmitting] = useState(false);

    // History Modal state
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyMaterialName, setHistoryMaterialName] = useState("");
    const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

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

    // Fetch materials + projections
    const fetchMaterials = async () => {
        if (!outletId) return;
        setLoading(true);
        try {
            const [data, projData] = await Promise.all([
                getRawMaterials(outletId),
                getStockProjections(outletId),
            ]);
            setMaterials(
                data.map((m) => ({
                    ...m,
                    currentStock: parsePrismaDecimal(m.currentStock),
                    averageCost: parsePrismaDecimal(m.averageCost),
                    packagingWeight: parsePrismaDecimal(m.packagingWeight),
                }))
            );
            setProjections(projData);
        } catch (err) {
            console.error("Failed to fetch materials:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && outletId) fetchMaterials();
    }, [user, outletId]);

    // Sort materials: most critical first, then by name
    const sortedMaterials = useMemo(() => {
        return [...materials].sort((a, b) => {
            const projA = projections[a.id];
            const projB = projections[b.id];
            const priorityA = projA ? STATUS_PRIORITY[projA.status] : 5;
            const priorityB = projB ? STATUS_PRIORITY[projB.status] : 5;
            if (priorityA !== priorityB) return priorityA - priorityB;
            // Same priority → sort by projectedDays ascending (sooner to run out first)
            const daysA = projA?.projectedDays ?? Infinity;
            const daysB = projB?.projectedDays ?? Infinity;
            if (daysA !== daysB) return daysA - daysB;
            return a.name.localeCompare(b.name);
        });
    }, [materials, projections]);

    // Count warnings
    const warningCounts = useMemo(() => {
        let habis = 0, kritis = 0, segeraBeli = 0;
        for (const mat of materials) {
            const proj = projections[mat.id];
            if (!proj) continue;
            if (proj.status === 'HABIS') habis++;
            else if (proj.status === 'KRITIS') kritis++;
            else if (proj.status === 'SEGERA_BELI') segeraBeli++;
        }
        return { habis, kritis, segeraBeli, total: habis + kritis + segeraBeli };
    }, [materials, projections]);

    const formatIDR = (val: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(val);

    // Auto-calculate cost (unit) and totalCost
    const handleStockChange = (val: string) => {
        setFormStock(val);
        if (formTotalCost && val && Number(val) > 0) {
            setFormCost((Number(formTotalCost) / Number(val)).toFixed(2));
        } else if (formCost && val && Number(val) > 0) {
            setFormTotalCost((Number(formCost) * Number(val)).toFixed(0));
        }
    };

    const handleCostChange = (val: string) => {
        setFormCost(val);
        if (formStock && val && Number(formStock) > 0) {
            setFormTotalCost((Number(formStock) * Number(val)).toFixed(0));
        }
    };

    const handleTotalCostChange = (val: string) => {
        setFormTotalCost(val);
        if (formStock && val && Number(formStock) > 0) {
            setFormCost((Number(val) / Number(formStock)).toFixed(2));
        }
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setFormName("");
        setFormSku("");
        setFormUnit("gram");
        setFormStock("");
        setFormCost("");
        setFormTotalCost("");
        setFormPackagingWeight("");
        setIsModalOpen(true);
    };

    const openEditModal = (m: RawMaterial) => {
        setEditingItem(m);
        setFormName(m.name);
        setFormSku(m.sku || "");
        setFormUnit(m.unit);
        setFormStock(m.currentStock.toString());
        setFormCost(m.averageCost.toString());
        setFormTotalCost((m.currentStock * m.averageCost).toFixed(0));
        setFormPackagingWeight(m.packagingWeight?.toString() || "0");
        setIsModalOpen(true);
    };

    const openHistoryModal = async (m: RawMaterial) => {
        setHistoryMaterialName(m.name);
        setPurchaseHistory([]);
        setIsHistoryModalOpen(true);
        setLoadingHistory(true);
        try {
            const history = await getRawMaterialPurchaseHistory(m.id);
            setPurchaseHistory(
                history.map((h) => ({
                    ...h,
                    quantity: parsePrismaDecimal(h.quantity),
                    unitPrice: parsePrismaDecimal(h.unitPrice),
                    totalAmount: parsePrismaDecimal(h.totalAmount),
                    date: new Date(h.date),
                }))
            );
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat riwayat pembelian");
        } finally {
            setLoadingHistory(false);
        }
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
                    packagingWeight: Number(formPackagingWeight) || 0,
                });
            } else {
                res = await createRawMaterial({
                    outletId,
                    name: formName,
                    sku: formSku || undefined,
                    unit: formUnit,
                    currentStock: Number(formStock) || 0,
                    averageCost: Number(formCost) || 0,
                    packagingWeight: Number(formPackagingWeight) || 0,
                });
            }
            if (res.success) {
                toast.success(editingItem ? "Bahan baku berhasil diperbarui" : "Bahan baku berhasil ditambahkan");
                setIsModalOpen(false);
                await fetchMaterials();
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
                await fetchMaterials();
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

            {/* Alert banner for critical items */}
            {warningCounts.total > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 shadow-sm">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                            Peringatan Stok Bahan Baku
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                            {warningCounts.habis > 0 && <span className="font-bold">{warningCounts.habis} item HABIS</span>}
                            {warningCounts.habis > 0 && (warningCounts.kritis > 0 || warningCounts.segeraBeli > 0) && " · "}
                            {warningCounts.kritis > 0 && <span className="font-bold">{warningCounts.kritis} item KRITIS (≤3 hari)</span>}
                            {warningCounts.kritis > 0 && warningCounts.segeraBeli > 0 && " · "}
                            {warningCounts.segeraBeli > 0 && <span>{warningCounts.segeraBeli} item perlu segera dibeli (≤7 hari)</span>}
                        </p>
                    </div>
                </div>
            )}

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
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
                        <CardTitle className="text-sm font-medium">Estimasi Nilai Stok (Asset)</CardTitle>
                        <Package className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{formatIDR(totalValue)}</div>
                        <p className="text-xs text-muted-foreground">Stok × Harga Modal Rata-rata</p>
                    </CardContent>
                </Card>
                <Card className={`border-l-4 shadow-sm ${warningCounts.total > 0 ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status Proyeksi Stok</CardTitle>
                        {warningCounts.total > 0 ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        )}
                    </CardHeader>
                    <CardContent>
                        {warningCounts.total > 0 ? (
                            <>
                                <div className="text-2xl font-bold text-red-600">{warningCounts.total} item</div>
                                <p className="text-xs text-muted-foreground">perlu perhatian (≤7 hari / habis)</p>
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-emerald-600">Semua Aman</div>
                                <p className="text-xs text-muted-foreground">Tidak ada bahan baku kritis</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                    <CardTitle>Daftar Bahan Baku</CardTitle>
                    <CardDescription>Kelola stok dan harga bahan baku Anda. Diurutkan berdasarkan urgensi proyeksi stok.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="hidden md:block overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-zinc-900 border-b">
                                    <tr>
                                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Nama</th>
                                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">SKU</th>
                                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Satuan</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Stok</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Harga Satuan Rata2</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Total Harga Stock</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Berat Packaging</th>
                                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Proyeksi Stok</th>
                                        <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {sortedMaterials.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-muted-foreground">
                                                Belum ada data bahan baku. Klik &quot;Tambah Bahan Baku&quot; untuk mulai.
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedMaterials.map((m) => {
                                            const proj = projections[m.id];
                                            const isUrgent = proj && (proj.status === 'HABIS' || proj.status === 'KRITIS');
                                            return (
                                                <tr
                                                    key={m.id}
                                                    className={`hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors ${isUrgent ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}
                                                >
                                                    <td className="p-3 font-medium whitespace-nowrap">{m.name}</td>
                                                    <td className="p-3 text-muted-foreground whitespace-nowrap">{m.sku || "—"}</td>
                                                    <td className="p-3 whitespace-nowrap">{m.unit}</td>
                                                    <td className="p-3 font-bold text-right whitespace-nowrap">{m.currentStock}</td>
                                                    <td className="p-3 text-right whitespace-nowrap">{formatIDR(m.averageCost)}</td>
                                                    <td className="p-3 text-right font-medium whitespace-nowrap">{formatIDR(m.currentStock * m.averageCost)}</td>
                                                    <td className="p-3 text-muted-foreground text-right whitespace-nowrap">{m.packagingWeight > 0 ? `${m.packagingWeight} ${m.unit}` : "-"}</td>
                                                    <td className="p-3 whitespace-nowrap">
                                                        <ProjectionBadge projection={proj} />
                                                    </td>
                                                    <td className="p-3 text-right whitespace-nowrap">
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="sm" onClick={() => openHistoryModal(m)} className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700" title="Riwayat Pembelian">
                                                                <History className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => openEditModal(m)} className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
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

                        {/* Mobile View */}
                        <div className="md:hidden space-y-4">
                            {sortedMaterials.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground border rounded-md bg-slate-50 dark:bg-zinc-900/50">
                                    Belum ada data bahan baku. Klik &quot;Tambah Bahan Baku&quot; untuk mulai.
                                </div>
                            ) : (
                                sortedMaterials.map((m) => {
                                    const proj = projections[m.id];
                                    const isUrgent = proj && (proj.status === 'HABIS' || proj.status === 'KRITIS');
                                    return (
                                        <div
                                            key={m.id}
                                            className={`bg-white dark:bg-zinc-950 border rounded-lg p-4 space-y-4 shadow-sm ${isUrgent ? 'border-red-200 dark:border-red-900/50 bg-red-50/10 dark:bg-red-950/10' : ''}`}
                                        >
                                            <div className="flex justify-between items-start border-b pb-3">
                                                <div className="space-y-1">
                                                    <div className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                                                        {m.name}
                                                    </div>
                                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                                        <span>SKU: {m.sku || "—"}</span>
                                                        <span>•</span>
                                                        <span>Satuan: {m.unit}</span>
                                                    </div>
                                                </div>
                                                <ProjectionBadge projection={proj} />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="space-y-1">
                                                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Stok Saat Ini</div>
                                                    <div className="font-bold text-lg text-slate-900 dark:text-white">
                                                        {m.currentStock} <span className="text-sm font-normal text-muted-foreground">{m.unit}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-1 text-right">
                                                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Nilai</div>
                                                    <div className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                                                        {formatIDR(m.currentStock * m.averageCost)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center bg-slate-50 dark:bg-zinc-900/50 p-2 rounded-md border text-xs">
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground">Harga Rata2:</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">{formatIDR(m.averageCost)} / {m.unit}</span>
                                                </div>
                                                {m.packagingWeight > 0 && (
                                                    <div className="flex flex-col text-right">
                                                        <span className="text-muted-foreground">Berat Wadah:</span>
                                                        <span className="font-medium text-slate-900 dark:text-slate-100">{m.packagingWeight} {m.unit}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-3 border-t flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openHistoryModal(m)} className="h-8 text-xs px-3 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950">
                                                    <History className="h-3.5 w-3.5 mr-1.5" /> Riwayat
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => openEditModal(m)} className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 border">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 border">
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Form Modal */}
            <Modal
                title={editingItem ? "Edit Bahan Baku" : "Tambah Bahan Baku"}
                description={editingItem ? "Perbarui data bahan baku. Stok dan harga modal dikunci karena diperbarui otomatis oleh sistem pembelian & stock opname." : "Masukkan data bahan baku baru."}
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">{editingItem ? "Stok Saat Ini" : "Stok Awal"}</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                value={formStock}
                                onChange={(e) => handleStockChange(e.target.value)}
                                disabled={!!editingItem}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">{editingItem ? "Harga Rata-Rata" : "Harga Satuan (Rp)"}</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={formCost}
                                onChange={(e) => handleCostChange(e.target.value)}
                                disabled={!!editingItem}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">{editingItem ? "Total Nilai" : "Harga Total (Rp)"}</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={formTotalCost}
                                onChange={(e) => handleTotalCostChange(e.target.value)}
                                disabled={!!editingItem}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Berat Packaging (Wadah) - Opsional</label>
                        <div className="flex relative">
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                value={formPackagingWeight}
                                onChange={(e) => setFormPackagingWeight(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pr-12"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                                {formUnit}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Berat wadah ini akan digunakan untuk otomatis menghitung berat bersih (netto) saat Stock Opname.</p>
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

            {/* History Modal */}
            <Modal
                title={`Riwayat Pembelian: ${historyMaterialName}`}
                description="Menampilkan semua transaksi masuk / pembelian untuk bahan baku ini."
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
            >
                <div className="space-y-4 pt-2 max-h-[50vh] overflow-y-auto">
                    {loadingHistory ? (
                        <div className="flex h-[200px] items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : purchaseHistory.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            Belum ada riwayat pembelian untuk bahan baku ini.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="hidden md:block overflow-hidden rounded-md border text-xs">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-zinc-900 border-b">
                                        <tr>
                                            <th className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">Tanggal</th>
                                            <th className="p-2.5 font-semibold text-slate-700 dark:text-slate-300 text-right">Jumlah</th>
                                            <th className="p-2.5 font-semibold text-slate-700 dark:text-slate-300 text-right">Harga Unit</th>
                                            <th className="p-2.5 font-semibold text-slate-700 dark:text-slate-300 text-right">Total</th>
                                            <th className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">Supplier/Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {purchaseHistory.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50">
                                                <td className="p-2.5 whitespace-nowrap">
                                                    {format(item.date, "dd MMM yyyy", { locale: idLocale })}
                                                </td>
                                                <td className="p-2.5 text-right font-medium whitespace-nowrap">
                                                    {item.quantity}
                                                </td>
                                                <td className="p-2.5 text-right text-muted-foreground whitespace-nowrap">
                                                    {formatIDR(item.unitPrice)}
                                                </td>
                                                <td className="p-2.5 text-right font-semibold whitespace-nowrap">
                                                    {formatIDR(item.totalAmount)}
                                                </td>
                                                <td className="p-2.5">
                                                    <div className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={item.supplier || ""}>{item.supplier || "—"}</div>
                                                    {item.notes && <div className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={item.notes}>{item.notes}</div>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View History */}
                            <div className="md:hidden space-y-3">
                                {purchaseHistory.map((item) => (
                                    <div key={item.id} className="bg-white dark:bg-zinc-950 border rounded-lg p-3 shadow-sm text-sm">
                                        <div className="flex justify-between items-start border-b pb-2 mb-2">
                                            <div className="font-medium text-slate-900 dark:text-slate-100">
                                                {format(item.date, "dd MMM yyyy", { locale: idLocale })}
                                            </div>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {formatIDR(item.totalAmount)}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-xs mb-2">
                                            <span className="text-muted-foreground">Jumlah: <span className="font-medium text-slate-900 dark:text-slate-100">{item.quantity}</span></span>
                                            <span className="text-muted-foreground">Harga/Unit: <span className="font-medium text-slate-900 dark:text-slate-100">{formatIDR(item.unitPrice)}</span></span>
                                        </div>
                                        <div className="text-xs bg-slate-50 dark:bg-zinc-900/50 p-2 rounded border">
                                            <div className="font-medium text-slate-700 dark:text-slate-300">Supplier: {item.supplier || "—"}</div>
                                            {item.notes && <div className="text-muted-foreground mt-0.5">{item.notes}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end pt-2 border-t">
                        <Button type="button" onClick={() => setIsHistoryModalOpen(false)}>
                            Tutup
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
