"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Plus, Search, Calendar as CalendarIcon, FileEdit, Trash2, Lock, Unlock, ShoppingCart, Package, Loader2, X, Receipt, CreditCard } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

import { getDailyRealRevenues, saveDailyRealRevenue, deleteDailyRealRevenue, getDailyCashReference, toggleDailyCashClose } from "@/actions/real-revenue"
import { getRawMaterials } from "@/actions/raw-materials"
import { createInventoryPurchase, deleteInventoryPurchase } from "@/actions/inventory-purchases"
import { createExpense, deleteExpense } from "@/actions/expenses"
import { saveRealRevenueSchema } from "@/lib/validation/real-revenue-schemas"
import { z } from "zod"

interface DailyCashClientProps {
    outlets: { id: string; name: string }[]
    userRole: string
    userOutletId?: string | null
}

interface RawMaterialOption {
    id: string;
    name: string;
    unit: string;
    averageCost: number;
}

interface DailyPurchaseItem {
    id: string;
    rawMaterialId: string;
    rawMaterialName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    supplier: string | null;
    notes: string | null;
}

interface DailyExpenseItem {
    id: string;
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

export function DailyCashClient({ outlets, userRole, userOutletId }: DailyCashClientProps) {
    const [records, setRecords] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOutlet, setSelectedOutlet] = useState<string>(
        userOutletId || (outlets.length > 0 ? outlets[0].id : "")
    )
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    
    // Reference state
    const [refLoading, setRefLoading] = useState(false)
    const [cashPurchases, setCashPurchases] = useState(0)
    const [webRevenue, setWebRevenue] = useState(0)
    const [dailyPurchases, setDailyPurchases] = useState<DailyPurchaseItem[]>([])

    // Raw materials for dropdown
    const [rawMaterials, setRawMaterials] = useState<RawMaterialOption[]>([])
    const [materialsLoading, setMaterialsLoading] = useState(false)

    // Sub-form state for adding purchase directly
    const [isAddingPurchase, setIsAddingPurchase] = useState(false)
    const [purchaseMaterialId, setPurchaseMaterialId] = useState("")
    const [purchaseQuantity, setPurchaseQuantity] = useState("")
    const [purchaseUnitPrice, setPurchaseUnitPrice] = useState("")
    const [purchaseTotalAmount, setPurchaseTotalAmount] = useState("")
    const [purchaseSupplier, setPurchaseSupplier] = useState("")
    const [purchaseNotes, setPurchaseNotes] = useState("")
    const [isSavingPurchase, setIsSavingPurchase] = useState(false)
    const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | null>(null)

    // Expense sub-form state
    const [cashExpenses, setCashExpenses] = useState(0)
    const [dailyExpenses, setDailyExpenses] = useState<DailyExpenseItem[]>([])
    const [isAddingExpense, setIsAddingExpense] = useState(false)
    const [expenseCategory, setExpenseCategory] = useState("OPERATIONAL")
    const [expenseAmount, setExpenseAmount] = useState("")
    const [expenseDescription, setExpenseDescription] = useState("")
    const [isSavingExpense, setIsSavingExpense] = useState(false)
    const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)

    const form = useForm<z.infer<typeof saveRealRevenueSchema>>({
        resolver: zodResolver(saveRealRevenueSchema) as any,
        defaultValues: {
            id: null,
            date: format(new Date(), 'yyyy-MM-dd'),
            outletId: selectedOutlet,
            cashAmount: 0,
            qrisAmount: 0,
            otherAmount: 0,
            otherMethodName: "",
            notes: ""
        }
    })

    const watchDate = form.watch("date")
    const watchOutlet = form.watch("outletId")
    const watchCash = form.watch("cashAmount")
    const watchQris = form.watch("qrisAmount")
    const watchOther = form.watch("otherAmount")

    const computedTotal = (Number(watchCash) || 0) + (Number(watchQris) || 0) + (Number(watchOther) || 0)
    const computedGross = computedTotal + cashPurchases + cashExpenses
    const webDiff = computedGross - webRevenue

    useEffect(() => {
        if (selectedOutlet) {
            fetchRecords()
        }
    }, [selectedOutlet])

    // Fetch reference data when date or outlet changes
    useEffect(() => {
        if (watchDate && watchOutlet && isDialogOpen) {
            fetchReference(watchOutlet, watchDate)
            fetchMaterials(watchOutlet)
        }
    }, [watchDate, watchOutlet, isDialogOpen])

    async function fetchMaterials(outletId: string) {
        setMaterialsLoading(true)
        try {
            const data = await getRawMaterials(outletId)
            setRawMaterials(data.map(m => ({
                id: m.id,
                name: m.name,
                unit: m.unit,
                averageCost: Number(m.averageCost)
            })))
        } catch (err) {
            console.error("Gagal memuat bahan baku:", err)
        } finally {
            setMaterialsLoading(false)
        }
    }

    async function fetchRecords() {
        setLoading(true)
        try {
            const data = await getDailyRealRevenues(selectedOutlet, 30)
            setRecords(data)
        } catch (error) {
            toast.error("Gagal memuat data")
        } finally {
            setLoading(false)
        }
    }

    async function fetchReference(outletId: string, date: string) {
        setRefLoading(true)
        try {
            const ref = await getDailyCashReference(outletId, date)
            setCashPurchases(ref.cashPurchases)
            setWebRevenue(ref.webRevenue)
            setDailyPurchases(ref.purchasesList || [])
            setCashExpenses(ref.cashExpenses || 0)
            setDailyExpenses(ref.expensesList || [])
        } catch (error) {
            console.error(error)
        } finally {
            setRefLoading(false)
        }
    }

    function handleMaterialSelect(materialId: string) {
        setPurchaseMaterialId(materialId)
        const mat = rawMaterials.find(m => m.id === materialId)
        if (mat && mat.averageCost > 0) {
            setPurchaseUnitPrice(mat.averageCost.toString())
            if (purchaseQuantity) {
                const qty = parseFloat(purchaseQuantity)
                if (!isNaN(qty)) {
                    setPurchaseTotalAmount(Math.round(qty * mat.averageCost).toString())
                }
            }
        }
    }

    function handleQuantityChange(val: string) {
        setPurchaseQuantity(val)
        const qty = parseFloat(val)
        const unitP = parseFloat(purchaseUnitPrice)
        if (!isNaN(qty) && !isNaN(unitP) && unitP > 0) {
            setPurchaseTotalAmount(Math.round(qty * unitP).toString())
        }
    }

    function handleUnitPriceChange(val: string) {
        setPurchaseUnitPrice(val)
        const unitP = parseFloat(val)
        const qty = parseFloat(purchaseQuantity)
        if (!isNaN(qty) && !isNaN(unitP)) {
            setPurchaseTotalAmount(Math.round(qty * unitP).toString())
        }
    }

    function handleTotalAmountChange(val: string) {
        setPurchaseTotalAmount(val)
        const total = parseFloat(val)
        const qty = parseFloat(purchaseQuantity)
        if (!isNaN(total) && !isNaN(qty) && qty > 0) {
            setPurchaseUnitPrice((total / qty).toFixed(2))
        }
    }

    async function handleAddPurchase() {
        if (!purchaseMaterialId) {
            toast.error("Pilih bahan baku terlebih dahulu")
            return
        }
        const qty = parseFloat(purchaseQuantity)
        if (isNaN(qty) || qty <= 0) {
            toast.error("Jumlah (Qty) harus lebih dari 0")
            return
        }
        const total = parseFloat(purchaseTotalAmount)
        if (isNaN(total) || total <= 0) {
            toast.error("Total harga belanja harus lebih dari 0")
            return
        }
        const unitPrice = parseFloat(purchaseUnitPrice) || (total / qty)

        setIsSavingPurchase(true)
        try {
            const res = await createInventoryPurchase({
                outletId: watchOutlet,
                rawMaterialId: purchaseMaterialId,
                date: new Date(watchDate),
                quantity: qty,
                unitPrice: unitPrice,
                totalAmount: total,
                supplier: purchaseSupplier || undefined,
                notes: purchaseNotes || undefined,
                paymentMethod: "CASH",
                paymentSource: "Cash",
                deliveryStatus: "RECEIVED"
            })

            if (res.success) {
                toast.success(res.message || "Pembelian berhasil dicatat dan masuk ke menu Pembelian!")
                // Reset form
                setPurchaseMaterialId("")
                setPurchaseQuantity("")
                setPurchaseUnitPrice("")
                setPurchaseTotalAmount("")
                setPurchaseSupplier("")
                setPurchaseNotes("")
                setIsAddingPurchase(false)
                // Reload reference data (which updates cashPurchases & dailyPurchases & total)
                fetchReference(watchOutlet, watchDate)
            } else {
                toast.error(res.error || "Gagal menyimpan pembelian")
            }
        } catch (error) {
            toast.error("Terjadi kesalahan saat menyimpan pembelian")
        } finally {
            setIsSavingPurchase(false)
        }
    }

    async function handleDeleteDailyPurchase(purchaseId: string) {
        if (!confirm("Hapus catatan pembelian ini? Stok bahan baku yang bertambah akan dikurangi kembali.")) return
        setDeletingPurchaseId(purchaseId)
        try {
            const res = await deleteInventoryPurchase(purchaseId)
            if (res.success) {
                toast.success("Pembelian berhasil dihapus")
                fetchReference(watchOutlet, watchDate)
            } else {
                toast.error(('error' in res && res.error) ? res.error : "Gagal menghapus pembelian")
            }
        } catch (error) {
            toast.error("Terjadi kesalahan saat menghapus pembelian")
        } finally {
            setDeletingPurchaseId(null)
        }
    }

    async function handleAddExpense() {
        const amount = parseFloat(expenseAmount)
        if (isNaN(amount) || amount <= 0) {
            toast.error("Jumlah pengeluaran harus lebih dari 0")
            return
        }

        setIsSavingExpense(true)
        try {
            const res = await createExpense({
                outletId: watchOutlet,
                date: new Date(watchDate + "T00:00:00Z"),
                category: expenseCategory,
                amount,
                description: expenseDescription || undefined,
                paymentMethod: "CASH",
                paymentSource: "Cash",
                paymentStatus: "PAID",
                deliveryStatus: "RECEIVED",
            })

            if (res.success) {
                toast.success("Pengeluaran berhasil dicatat dan masuk ke menu Pengeluaran!")
                setExpenseCategory("OPERATIONAL")
                setExpenseAmount("")
                setExpenseDescription("")
                setIsAddingExpense(false)
                fetchReference(watchOutlet, watchDate)
            } else {
                toast.error(res.error || "Gagal menyimpan pengeluaran")
            }
        } catch (error) {
            toast.error("Terjadi kesalahan saat menyimpan pengeluaran")
        } finally {
            setIsSavingExpense(false)
        }
    }

    async function handleDeleteDailyExpense(expenseId: string) {
        if (!confirm("Hapus catatan pengeluaran ini?")) return
        setDeletingExpenseId(expenseId)
        try {
            const res = await deleteExpense(expenseId)
            if (res.success) {
                toast.success("Pengeluaran berhasil dihapus")
                fetchReference(watchOutlet, watchDate)
            } else {
                toast.error(res.error || "Gagal menghapus pengeluaran")
            }
        } catch (error) {
            toast.error("Terjadi kesalahan saat menghapus pengeluaran")
        } finally {
            setDeletingExpenseId(null)
        }
    }

    async function onSubmit(values: z.infer<typeof saveRealRevenueSchema>) {
        setIsSubmitting(true)
        try {
            const res = await saveDailyRealRevenue(values)
            if (res.success) {
                toast.success("Catatan kas berhasil disimpan")
                setIsDialogOpen(false)
                fetchRecords()
            } else {
                toast.error(res.error || "Gagal menyimpan data")
            }
        } catch (error) {
            toast.error("Terjadi kesalahan")
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Apakah Anda yakin ingin menghapus catatan ini?")) return
        try {
            const res = await deleteDailyRealRevenue(id)
            if (res.success) {
                toast.success("Catatan berhasil dihapus")
                fetchRecords()
            } else {
                toast.error(res.error || "Gagal menghapus")
            }
        } catch (error) {
            toast.error("Terjadi kesalahan")
        }
    }
    
    async function handleToggleClose(id: string) {
        if (!confirm("Apakah Anda yakin ingin mengubah status closing hari ini?")) return
        try {
            const res = await toggleDailyCashClose(id)
            if (res.success) {
                toast.success("Status berhasil diubah")
                fetchRecords()
            } else {
                toast.error(res.error || "Gagal mengubah status")
            }
        } catch (error) {
            toast.error("Terjadi kesalahan")
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <Select value={selectedOutlet} onValueChange={(val) => {
                        setSelectedOutlet(val)
                        form.setValue("outletId", val)
                    }}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Pilih Outlet" />
                        </SelectTrigger>
                        <SelectContent>
                            {outlets.map(o => (
                                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                <Button onClick={() => {
                    form.reset({
                        id: null,
                        date: format(new Date(), 'yyyy-MM-dd'),
                        outletId: selectedOutlet,
                        cashAmount: 0,
                        qrisAmount: 0,
                        otherAmount: 0,
                        otherMethodName: "",
                        notes: ""
                    })
                    setIsDialogOpen(true)
                }}>
                    <Plus className="mr-2 h-4 w-4" /> Catat Kas Harian
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Kas Harian</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-4">Memuat data...</div>
                    ) : records.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Belum ada catatan kas.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead className="text-right">Kas Fisik</TableHead>
                                        <TableHead className="text-right">QRIS</TableHead>
                                        <TableHead className="text-right">Belanja (Cash)</TableHead>
                                        <TableHead className="text-right">Omset Kotor</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map(record => (
                                        <TableRow key={record.id}>
                                            <TableCell className="font-medium">
                                                {format(new Date(record.date), 'dd MMM yyyy', { locale: id })}
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(record.cashAmount)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(record.qrisAmount)}</TableCell>
                                            <TableCell className="text-right text-red-500">
                                                {record.cashPurchases > 0 ? `-${formatCurrency(record.cashPurchases)}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-bold">{formatCurrency(record.grossRevenue)}</TableCell>
                                            <TableCell>
                                                <Badge variant={record.isClosed ? "secondary" : "default"}>
                                                    {record.isClosed ? "Closed" : "Open"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                {(userRole !== 'kasir' || !record.isClosed) && (
                                                    <Button variant="ghost" size="sm" onClick={() => {
                                                        form.reset({
                                                            id: record.id,
                                                            date: record.date,
                                                            outletId: record.outletId,
                                                            cashAmount: record.cashAmount,
                                                            qrisAmount: record.qrisAmount,
                                                            otherAmount: record.otherAmount,
                                                            otherMethodName: record.otherMethodName || "",
                                                            notes: record.notes || ""
                                                        })
                                                        setIsDialogOpen(true)
                                                    }}>
                                                        <FileEdit className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                
                                                {userRole !== 'kasir' && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleToggleClose(record.id)} title={record.isClosed ? "Buka Kembali" : "Tutup Hari Ini"}>
                                                        {record.isClosed ? <Unlock className="h-4 w-4 text-orange-500" /> : <Lock className="h-4 w-4 text-green-500" />}
                                                    </Button>
                                                )}

                                                {userRole === 'owner' && (
                                                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(record.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Catatan Kas Harian</DialogTitle>
                        <DialogDescription>
                            Masukkan sisa kas fisik di laci (setelah dikurangi belanja harian) dan rekap transaksi QRIS.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control as any}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tanggal</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Reference Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <Card className="bg-slate-50 dark:bg-slate-900 border-dashed">
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                        <p className="text-sm text-muted-foreground">Omset Web (Sistem)</p>
                                        <p className="text-2xl font-bold">{refLoading ? "..." : formatCurrency(webRevenue)}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-slate-50 dark:bg-slate-900 border-dashed">
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                        <p className="text-sm text-muted-foreground">Belanja Harian (Cash)</p>
                                        <p className="text-2xl font-bold text-red-500">{refLoading ? "..." : formatCurrency(cashPurchases)}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-slate-50 dark:bg-slate-900 border-dashed">
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                        <p className="text-sm text-muted-foreground">Pengeluaran (Cash)</p>
                                        <p className="text-2xl font-bold text-orange-500">{refLoading ? "..." : formatCurrency(cashExpenses)}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Section Rincian Belanja Harian (Cash / Nota Kasir) */}
                            <div className="space-y-3 pt-2 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-sm flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                            <ShoppingCart className="h-4 w-4 text-red-500" />
                                            Belanja Harian / Nota Kasir (Cash)
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            Item belanja otomatis masuk ke menu Pembelian & memperbarui stok.
                                        </p>
                                    </div>
                                    {!isAddingPurchase && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="text-xs border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                            onClick={() => setIsAddingPurchase(true)}
                                        >
                                            <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Belanja
                                        </Button>
                                    )}
                                </div>

                                {/* Form Tambah Belanja (Sub-form) */}
                                {isAddingPurchase && (
                                    <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 p-3 space-y-3">
                                        <div className="flex items-center justify-between pb-2 border-b border-red-200 dark:border-red-900/40">
                                            <span className="font-medium text-xs text-red-700 dark:text-red-400 flex items-center gap-1">
                                                <Package className="h-3.5 w-3.5" /> Tambah Pembelian Bahan Baku
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-red-700"
                                                onClick={() => setIsAddingPurchase(false)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Bahan Baku *</label>
                                                <Select value={purchaseMaterialId} onValueChange={handleMaterialSelect}>
                                                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                                                        <SelectValue placeholder="-- Pilih Bahan Baku --" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {materialsLoading ? (
                                                            <div className="p-2 text-xs text-muted-foreground text-center">Memuat bahan baku...</div>
                                                        ) : rawMaterials.length === 0 ? (
                                                            <div className="p-2 text-xs text-muted-foreground text-center">Tidak ada bahan baku</div>
                                                        ) : (
                                                            rawMaterials.map(m => (
                                                                <SelectItem key={m.id} value={m.id} className="text-xs">
                                                                    {m.name} ({m.unit})
                                                                </SelectItem>
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Jumlah (Qty) *</label>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        placeholder="Qty"
                                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                                        value={purchaseQuantity}
                                                        onChange={(e) => handleQuantityChange(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Harga Satuan (Rp)</label>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        placeholder="Rp Satuan"
                                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                                        value={purchaseUnitPrice}
                                                        onChange={(e) => handleUnitPriceChange(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Total Harga (Rp) *</label>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        placeholder="Rp Total"
                                                        className="h-8 text-xs bg-white dark:bg-slate-900 font-semibold text-red-600"
                                                        value={purchaseTotalAmount}
                                                        onChange={(e) => handleTotalAmountChange(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Toko / Supplier (Opsional)</label>
                                                    <Input
                                                        type="text"
                                                        placeholder="Nama Toko / Supplier"
                                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                                        value={purchaseSupplier}
                                                        onChange={(e) => setPurchaseSupplier(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Catatan (Opsional)</label>
                                                    <Input
                                                        type="text"
                                                        placeholder="Keterangan..."
                                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                                        value={purchaseNotes}
                                                        onChange={(e) => setPurchaseNotes(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => setIsAddingPurchase(false)}
                                                >
                                                    Batal
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                                                    disabled={isSavingPurchase}
                                                    onClick={handleAddPurchase}
                                                >
                                                    {isSavingPurchase ? (
                                                        <>
                                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Menyimpan...
                                                        </>
                                                    ) : (
                                                        "Simpan Pembelian"
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* Daftar Belanja Harian (Cash) yang sudah diinput */}
                                {refLoading ? (
                                    <div className="text-xs text-muted-foreground text-center py-2">Memuat rincian belanja...</div>
                                ) : dailyPurchases.length === 0 ? (
                                    <div className="text-xs text-slate-500 italic bg-white dark:bg-slate-900/50 p-2.5 rounded text-center border border-dashed">
                                        Belum ada barang belanja tunai dicatat untuk tanggal ini. Klik "+ Tambah Belanja" untuk memasukkan nota kasir.
                                    </div>
                                ) : (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                        {dailyPurchases.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs shadow-sm"
                                            >
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                        {item.rawMaterialName}
                                                    </div>
                                                    <div className="text-slate-500 text-[11px] flex gap-2">
                                                        <span>
                                                            {item.quantity} {item.unit} @ {formatCurrency(item.unitPrice)}
                                                        </span>
                                                        {item.supplier && <span className="truncate">({item.supplier})</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-red-600">
                                                        {formatCurrency(item.totalAmount)}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                        disabled={deletingPurchaseId === item.id}
                                                        onClick={() => handleDeleteDailyPurchase(item.id)}
                                                        title="Hapus Pembelian Ini"
                                                    >
                                                        {deletingPurchaseId === item.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section Pengeluaran Harian (Cash) */}
                            <div className="space-y-3 pt-2 bg-orange-50/50 dark:bg-orange-950/20 p-3.5 rounded-lg border border-orange-200/80 dark:border-orange-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-sm flex items-center gap-2 text-orange-800 dark:text-orange-200">
                                            <Receipt className="h-4 w-4 text-orange-500" />
                                            Pengeluaran Harian (Cash)
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            Item pengeluaran otomatis masuk ke menu Pengeluaran.
                                        </p>
                                    </div>
                                    {!isAddingExpense && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="text-xs border-orange-200 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                                            onClick={() => setIsAddingExpense(true)}
                                        >
                                            <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Pengeluaran
                                        </Button>
                                    )}
                                </div>

                                {/* Form Tambah Pengeluaran (Sub-form) */}
                                {isAddingExpense && (
                                    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 p-3 space-y-3">
                                        <div className="flex items-center justify-between pb-2 border-b border-orange-200 dark:border-orange-900/40">
                                            <span className="font-medium text-xs text-orange-700 dark:text-orange-400 flex items-center gap-1">
                                                <CreditCard className="h-3.5 w-3.5" /> Tambah Pengeluaran Operasional
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-orange-700"
                                                onClick={() => setIsAddingExpense(false)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Kategori *</label>
                                                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                                                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                                                        <SelectValue placeholder="-- Pilih Kategori --" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {EXPENSE_CATEGORIES.map(c => (
                                                            <SelectItem key={c.value} value={c.value} className="text-xs">
                                                                {c.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Jumlah (Rp) *</label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        placeholder="Contoh: 50000"
                                                        className="h-8 text-xs bg-white dark:bg-slate-900 font-semibold text-orange-600"
                                                        value={expenseAmount}
                                                        onChange={(e) => setExpenseAmount(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Keterangan (Opsional)</label>
                                                    <Input
                                                        type="text"
                                                        placeholder="Misal: Bayar listrik"
                                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                                        value={expenseDescription}
                                                        onChange={(e) => setExpenseDescription(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => setIsAddingExpense(false)}
                                                >
                                                    Batal
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                                                    disabled={isSavingExpense}
                                                    onClick={handleAddExpense}
                                                >
                                                    {isSavingExpense ? (
                                                        <>
                                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Menyimpan...
                                                        </>
                                                    ) : (
                                                        "Simpan Pengeluaran"
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* Daftar Pengeluaran Harian (Cash) yang sudah diinput */}
                                {refLoading ? (
                                    <div className="text-xs text-muted-foreground text-center py-2">Memuat rincian pengeluaran...</div>
                                ) : dailyExpenses.length === 0 ? (
                                    <div className="text-xs text-slate-500 italic bg-white dark:bg-slate-900/50 p-2.5 rounded text-center border border-dashed">
                                        Belum ada pengeluaran tunai dicatat untuk tanggal ini. Klik &quot;+ Tambah Pengeluaran&quot; untuk mencatat.
                                    </div>
                                ) : (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                        {dailyExpenses.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs shadow-sm"
                                            >
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                        {EXPENSE_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                                                    </div>
                                                    {item.description && (
                                                        <div className="text-slate-500 text-[11px] truncate">
                                                            {item.description}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-orange-600">
                                                        {formatCurrency(item.amount)}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                        disabled={deletingExpenseId === item.id}
                                                        onClick={() => handleDeleteDailyExpense(item.id)}
                                                        title="Hapus Pengeluaran Ini"
                                                    >
                                                        {deletingExpenseId === item.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="font-medium text-lg">Input Kasir</h3>
                                
                                <FormField
                                    control={form.control as any}
                                    name="cashAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Kas Fisik (Uang di Laci)</FormLabel>
                                            <FormDescription>Jumlah uang tunai aktual di akhir shift</FormDescription>
                                            <FormControl>
                                                <Input type="number" min="0" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="qrisAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Penjualan QRIS</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="0" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control as any}
                                        name="otherAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nominal Lain-lain (Opsional)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="0" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="otherMethodName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nama Metode Lain</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Misal: GoPay, Transfer Bank" {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm">Total Setor/Input</span>
                                    <span className="font-medium">{formatCurrency(computedTotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm">Belanja Cash (Otomatis)</span>
                                    <span className="font-medium text-red-500">+{formatCurrency(cashPurchases)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm">Pengeluaran Cash (Otomatis)</span>
                                    <span className="font-medium text-orange-500">+{formatCurrency(cashExpenses)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 mt-2 font-bold text-lg">
                                    <span>Omset Kotor (Hari Ini)</span>
                                    <span>{formatCurrency(computedGross)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-muted-foreground">Selisih dgn Sistem</span>
                                    <span className={webDiff >= 0 ? "text-green-500" : "text-red-500"}>
                                        {webDiff > 0 ? "+" : ""}{formatCurrency(webDiff)}
                                    </span>
                                </div>
                            </div>

                            <FormField
                                control={form.control as any}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Catatan (Opsional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Keterangan tambahan..." {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Menyimpan..." : "Simpan Catatan Kas"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
