"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Plus, Search, Calendar as CalendarIcon, FileEdit, Trash2, Lock, Unlock } from "lucide-react"

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
import { saveRealRevenueSchema } from "@/lib/validation/real-revenue-schemas"
import { z } from "zod"

interface DailyCashClientProps {
    outlets: { id: string; name: string }[]
    userRole: string
    userOutletId?: string | null
}

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

    const form = useForm<z.infer<typeof saveRealRevenueSchema>>({
        resolver: zodResolver(saveRealRevenueSchema),
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
    const computedGross = computedTotal + cashPurchases
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
        }
    }, [watchDate, watchOutlet, isDialogOpen])

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
        } catch (error) {
            console.error(error)
        } finally {
            setRefLoading(false)
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
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
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
                            <div className="grid grid-cols-2 gap-4">
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
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="font-medium text-lg">Input Kasir</h3>
                                
                                <FormField
                                    control={form.control}
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
                                    control={form.control}
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
                                        control={form.control}
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
                                        control={form.control}
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
                                control={form.control}
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
