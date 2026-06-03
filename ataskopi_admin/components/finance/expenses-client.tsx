"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
} from "@/actions/expenses";
import {
    Plus,
    Edit,
    Trash,
    Loader2,
    Receipt,
    TrendingDown,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface Expense {
    id: string;
    outletId: string;
    date: Date;
    category: string;
    amount: number;
    description: string | null;
}

const EXPENSE_CATEGORIES = [
    { value: "OPERATIONAL", label: "Operasional" },
    { value: "SALARY", label: "Gaji Karyawan" },
    { value: "UTILITY", label: "Utilitas (Listrik/Air/Gas)" },
    { value: "RENT", label: "Sewa Tempat" },
    { value: "OTHER", label: "Lain-lain" },
];

const CATEGORY_COLORS: Record<string, string> = {
    OPERATIONAL: "bg-blue-100 text-blue-700",
    SALARY: "bg-purple-100 text-purple-700",
    UTILITY: "bg-amber-100 text-amber-700",
    RENT: "bg-cyan-100 text-cyan-700",
    STOCK_LOSS: "bg-red-100 text-red-700", // For viewing older stock loss records
    OTHER: "bg-slate-100 text-slate-700",
};

const PERIOD_OPTIONS = [
    { value: "this_month", label: "Bulan Ini" },
    { value: "last_month", label: "Bulan Lalu" },
    { value: "last_3_months", label: "3 Bulan Terakhir" },
    { value: "all", label: "Semua" },
];

export function ExpensesClient() {
    const { user } = useCurrentUser();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
    const [outletId, setOutletId] = useState<string | null>(null);
    const [period, setPeriod] = useState("this_month");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Expense | null>(null);
    const [formDate, setFormDate] = useState("");
    const [formCategory, setFormCategory] = useState("OPERATIONAL");
    const [formAmount, setFormAmount] = useState("");
    const [formDescription, setFormDescription] = useState("");
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

    const fetchExpenses = async () => {
        if (!outletId) return;
        setLoading(true);
        try {
            const { start, end } = getDateRange();
            const data = await getExpenses(outletId, start, end);
            setExpenses(data.map((e) => ({
                ...e,
                amount: Number(e.amount),
                date: new Date(e.date),
            })));
        } catch (err) {
            console.error("Failed to fetch expenses:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && outletId) fetchExpenses();
    }, [user, outletId, period]);

    const formatIDR = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expensesByCategory = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);

    const openCreateModal = () => {
        setEditingItem(null);
        setFormDate(new Date().toLocaleDateString("en-CA"));
        setFormCategory("OPERATIONAL");
        setFormAmount("");
        setFormDescription("");
        setIsModalOpen(true);
    };

    const openEditModal = (e: Expense) => {
        setEditingItem(e);
        setFormDate(format(new Date(e.date), "yyyy-MM-dd"));
        setFormCategory(e.category);
        setFormAmount(e.amount.toString());
        setFormDescription(e.description || "");
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!outletId) return;
        setFormSubmitting(true);
        try {
            let res;
            if (editingItem) {
                res = await updateExpense(editingItem.id, {
                    date: new Date(formDate + "T00:00:00Z"),
                    category: formCategory,
                    amount: Number(formAmount),
                    description: formDescription || undefined,
                });
            } else {
                res = await createExpense({
                    outletId,
                    date: new Date(formDate + "T00:00:00Z"),
                    category: formCategory,
                    amount: Number(formAmount),
                    description: formDescription || undefined,
                });
            }
            if (res.success) {
                toast.success(editingItem ? "Pengeluaran berhasil diperbarui" : "Pengeluaran berhasil dicatat");
                setIsModalOpen(false);
                await fetchExpenses();
            } else {
                toast.error(res.error || "Gagal menyimpan pengeluaran");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus catatan pengeluaran ini?")) return;
        try {
            const res = await deleteExpense(id);
            if (res.success) {
                toast.success("Pengeluaran berhasil dihapus");
                await fetchExpenses();
            } else {
                toast.error(res.error || "Gagal menghapus");
            }
        } catch (err) {
            console.error(err);
            toast.error("Terjadi kesalahan sistem");
        }
    };

    if (loading && !expenses.length) {
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
                    <Plus className="h-4 w-4" /> Catat Pengeluaran
                </Button>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-red-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatIDR(totalExpenses)}</div>
                    </CardContent>
                </Card>
                {Object.entries(expensesByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([cat, amount]) => (
                        <Card key={cat} className="shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label || 
                                     (cat === "STOCK_LOSS" ? "Waste / Stock Loss" : cat)}
                                </CardTitle>
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">{formatIDR(amount)}</div>
                                <p className="text-xs text-muted-foreground">
                                    {totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0}% dari total
                                </p>
                            </CardContent>
                        </Card>
                    ))}
            </div>

            {/* Table */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                    <CardTitle>Riwayat Pengeluaran</CardTitle>
                    <CardDescription>Catat biaya operasional, utilitas, gaji karyawan, dan pengeluaran lainnya.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-zinc-900 border-b">
                                <tr>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Tanggal</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Kategori</th>
                                    <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">Keterangan</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Jumlah (Rp)</th>
                                    <th className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {expenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            Belum ada riwayat pengeluaran. Klik &quot;Catat Pengeluaran&quot; untuk mulai.
                                        </td>
                                    </tr>
                                ) : (
                                    expenses.map((e) => (
                                        <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                                            <td className="p-3 font-medium">
                                                {format(new Date(e.date), "dd MMM yyyy", { locale: idLocale })}
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${CATEGORY_COLORS[e.category] || CATEGORY_COLORS.OTHER}`}>
                                                    {EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label || 
                                                     (e.category === "STOCK_LOSS" ? "Waste / Stock Loss" : e.category)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-muted-foreground max-w-xs truncate">{e.description || "—"}</td>
                                            <td className="p-3 text-right font-bold text-red-600">{formatIDR(e.amount)}</td>
                                            <td className="p-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => openEditModal(e)} className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
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
                title={editingItem ? "Edit Pengeluaran" : "Catat Pengeluaran"}
                description={editingItem ? "Perbarui data pengeluaran." : "Masukkan catatan pengeluaran baru."}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            >
                <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Tanggal *</label>
                            <input
                                type="date"
                                required
                                value={formDate}
                                onChange={(e) => setFormDate(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Kategori *</label>
                            <select
                                required
                                value={formCategory}
                                onChange={(e) => setFormCategory(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                {EXPENSE_CATEGORIES.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium">Jumlah (Rp) *</label>
                        <input
                            type="number"
                            required
                            min="0"
                            placeholder="Contoh: 500000"
                            value={formAmount}
                            onChange={(e) => setFormAmount(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Keterangan (Opsional)</label>
                        <textarea
                            placeholder="Misal: Bayar listrik bulanan"
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
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
