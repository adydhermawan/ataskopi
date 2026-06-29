"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Plus, Search, FileText } from "lucide-react"

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
    DialogFooter,
} from "@/components/ui/dialog"
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

import { getDraftClosing, submitClosing, getClosings } from "@/actions/closing"

interface ClosingClientProps {
    outlets: { id: string; name: string }[]
    userRole: string
    userOutletId?: string | null
}

export function ClosingClient({ outlets, userRole, userOutletId }: ClosingClientProps) {
    const [records, setRecords] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOutlet, setSelectedOutlet] = useState<string>(
        userOutletId || (outlets.length > 0 ? outlets[0].id : "")
    )
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    
    const [targetDate, setTargetDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [draftData, setDraftData] = useState<any>(null)
    const [draftLoading, setDraftLoading] = useState(false)

    // Form states
    const [actualCash, setActualCash] = useState<number | "">("")
    const [actualQris, setActualQris] = useState<number | "">("")
    const [cashNotes, setCashNotes] = useState("")
    const [qrisNotes, setQrisNotes] = useState("")
    const [generalNotes, setGeneralNotes] = useState("")

    useEffect(() => {
        if (selectedOutlet) {
            fetchRecords()
        }
    }, [selectedOutlet])

    const fetchRecords = async () => {
        setLoading(true)
        try {
            const data = await getClosings(selectedOutlet)
            setRecords(data)
        } catch (error) {
            toast.error("Gagal memuat riwayat tutup buku")
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateDraft = async () => {
        if (!selectedOutlet) return toast.error("Pilih outlet terlebih dahulu")
        if (!targetDate) return toast.error("Pilih tanggal akhir tutup buku")

        setDraftLoading(true)
        try {
            const data = await getDraftClosing(selectedOutlet, targetDate)
            setDraftData(data)
            setActualCash("")
            setActualQris("")
            setCashNotes("")
            setQrisNotes("")
            setGeneralNotes("")
        } catch (error: any) {
            toast.error(error.message || "Gagal menghitung draft tutup buku")
        } finally {
            setDraftLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!draftData) return

        if (actualCash === "" || actualQris === "") {
            return toast.error("Harap isi nominal aktual untuk Cash dan QRIS")
        }

        const varCash = Number(actualCash) - draftData.expectedCash
        const varQris = Number(actualQris) - draftData.expectedQris

        if (varCash !== 0 && !cashNotes) {
            return toast.error("Wajib mengisi catatan untuk selisih Cash")
        }
        if (varQris !== 0 && !qrisNotes) {
            return toast.error("Wajib mengisi catatan untuk selisih QRIS")
        }

        setIsSubmitting(true)
        try {
            await submitClosing({
                outletId: selectedOutlet,
                startDate: draftData.startDate,
                endDate: draftData.endDate,
                notes: generalNotes,
                balances: [
                    {
                        paymentMethod: 'CASH',
                        systemAmount: draftData.expectedCash,
                        actualAmount: Number(actualCash),
                        notes: cashNotes
                    },
                    {
                        paymentMethod: 'QRIS',
                        systemAmount: draftData.expectedQris,
                        actualAmount: Number(actualQris),
                        notes: qrisNotes
                    }
                ]
            })
            toast.success("Tutup buku berhasil disimpan!")
            setIsDialogOpen(false)
            fetchRecords()
        } catch (error: any) {
            toast.error(error.message || "Gagal menyimpan tutup buku")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex w-full sm:w-auto items-center gap-2">
                    <Select value={selectedOutlet} onValueChange={setSelectedOutlet} disabled={!!userOutletId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Pilih Outlet" />
                        </SelectTrigger>
                        <SelectContent>
                            {outlets.map((outlet) => (
                                <SelectItem key={outlet.id} value={outlet.id}>
                                    {outlet.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {(userRole === 'owner' || userRole === 'manager') && (
                    <Button onClick={() => {
                        setIsDialogOpen(true)
                        setDraftData(null)
                    }}>
                        <Plus className="mr-2 h-4 w-4" /> Tutup Buku Baru
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Tutup Buku</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-4">Memuat data...</div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Periode</TableHead>
                                        <TableHead>Tgl Closing</TableHead>
                                        <TableHead>Dibuat Oleh</TableHead>
                                        <TableHead>Total Cash</TableHead>
                                        <TableHead>Total QRIS</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center">Tidak ada riwayat closing</TableCell>
                                        </TableRow>
                                    ) : (
                                        records.map((r) => {
                                            const cashBal = r.balances.find((b: any) => b.paymentMethod === 'CASH')
                                            const qrisBal = r.balances.find((b: any) => b.paymentMethod === 'QRIS')
                                            return (
                                                <TableRow key={r.id}>
                                                    <TableCell>
                                                        {format(new Date(r.startDate), 'dd MMM yyyy', { locale: id })} - {format(new Date(r.endDate), 'dd MMM yyyy', { locale: id })}
                                                    </TableCell>
                                                    <TableCell>{format(new Date(r.createdAt), 'dd MMM yyyy HH:mm', { locale: id })}</TableCell>
                                                    <TableCell>{r.closedBy}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span>Rp {Number(cashBal?.actualAmount || 0).toLocaleString('id-ID')}</span>
                                                            {Number(cashBal?.varianceAmount) !== 0 && (
                                                                <span className={Number(cashBal?.varianceAmount) < 0 ? "text-red-500 text-xs" : "text-green-500 text-xs"}>
                                                                    Selisih: Rp {Number(cashBal?.varianceAmount).toLocaleString('id-ID')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                    <div className="flex flex-col">
                                                            <span>Rp {Number(qrisBal?.actualAmount || 0).toLocaleString('id-ID')}</span>
                                                            {Number(qrisBal?.varianceAmount) !== 0 && (
                                                                <span className={Number(qrisBal?.varianceAmount) < 0 ? "text-red-500 text-xs" : "text-green-500 text-xs"}>
                                                                    Selisih: Rp {Number(qrisBal?.varianceAmount).toLocaleString('id-ID')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="bg-green-50 text-green-700">{r.status}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Tutup Buku (Closing)</DialogTitle>
                        <DialogDescription>
                            Rekonsiliasi data kasir dengan hitungan fisik dan rekening.
                        </DialogDescription>
                    </DialogHeader>

                    {!draftData ? (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tanggal Tutup (End Date)</label>
                                <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
                                <p className="text-xs text-muted-foreground">Sistem akan otomatis menghitung dari tanggal closing terakhir sampai tanggal ini.</p>
                            </div>
                            <Button onClick={handleGenerateDraft} disabled={draftLoading} className="w-full">
                                {draftLoading ? "Menghitung..." : "Mulai Rekonsiliasi"}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6 py-4">
                            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">Periode Closing:</p>
                                    <p>{format(new Date(draftData.startDate), 'dd MMM yyyy HH:mm')} s/d {format(new Date(draftData.endDate), 'dd MMM yyyy HH:mm')}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setDraftData(null)}>Ganti Tanggal</Button>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2">1. Kas Fisik (CASH)</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>Saldo Awal Cash:</div><div className="text-right">Rp {draftData.openingCash.toLocaleString('id-ID')}</div>
                                    <div>+ Pemasukan Cash (Omset):</div><div className="text-right text-green-600">Rp {draftData.cashSales.toLocaleString('id-ID')}</div>
                                    <div>- Pengeluaran Cash (Beli Bahan):</div><div className="text-right text-red-600">Rp {draftData.cashPurchases.toLocaleString('id-ID')}</div>
                                    <div className="font-bold border-t pt-2">Ekspektasi Sistem:</div><div className="font-bold border-t pt-2 text-right">Rp {draftData.expectedCash.toLocaleString('id-ID')}</div>
                                </div>
                                <div className="pt-2">
                                    <label className="text-sm font-medium">Uang Fisik Aktual di Laci (Rp)</label>
                                    <Input 
                                        type="number" 
                                        value={actualCash} 
                                        onChange={e => setActualCash(e.target.value === "" ? "" : Number(e.target.value))} 
                                        placeholder="Masukkan nominal hasil hitung fisik"
                                    />
                                    {actualCash !== "" && (Number(actualCash) - draftData.expectedCash) !== 0 && (
                                        <div className="mt-2 space-y-1">
                                            <p className={`text-sm font-medium ${(Number(actualCash) - draftData.expectedCash) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                Selisih: Rp {(Number(actualCash) - draftData.expectedCash).toLocaleString('id-ID')}
                                            </p>
                                            <Input 
                                                value={cashNotes} 
                                                onChange={e => setCashNotes(e.target.value)} 
                                                placeholder="Wajib isi alasan selisih (contoh: uang palsu, kembalian kurang)"
                                                className="border-red-200"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2">2. Rekening / E-Wallet (QRIS)</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>Saldo Awal QRIS:</div><div className="text-right">Rp {draftData.openingQris.toLocaleString('id-ID')}</div>
                                    <div>+ Pemasukan QRIS:</div><div className="text-right text-green-600">Rp {draftData.qrisSales.toLocaleString('id-ID')}</div>
                                    <div className="font-bold border-t pt-2">Ekspektasi Sistem:</div><div className="font-bold border-t pt-2 text-right">Rp {draftData.expectedQris.toLocaleString('id-ID')}</div>
                                </div>
                                <div className="pt-2">
                                    <label className="text-sm font-medium">Saldo Aktual Mutasi QRIS (Rp)</label>
                                    <Input 
                                        type="number" 
                                        value={actualQris} 
                                        onChange={e => setActualQris(e.target.value === "" ? "" : Number(e.target.value))} 
                                        placeholder="Masukkan saldo akhir di aplikasi/bank"
                                    />
                                    {actualQris !== "" && (Number(actualQris) - draftData.expectedQris) !== 0 && (
                                        <div className="mt-2 space-y-1">
                                            <p className={`text-sm font-medium ${(Number(actualQris) - draftData.expectedQris) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                Selisih: Rp {(Number(actualQris) - draftData.expectedQris).toLocaleString('id-ID')}
                                            </p>
                                            <Input 
                                                value={qrisNotes} 
                                                onChange={e => setQrisNotes(e.target.value)} 
                                                placeholder="Wajib isi alasan selisih (contoh: potongan biaya admin/MDR)"
                                                className="border-red-200"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 border-t pt-4">
                                <label className="text-sm font-medium">Catatan Tambahan (Opsional)</label>
                                <Textarea 
                                    value={generalNotes} 
                                    onChange={e => setGeneralNotes(e.target.value)} 
                                    placeholder="Tuliskan catatan tambahan jika ada..." 
                                />
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                                <Button onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? "Menyimpan..." : "Posting & Kunci Data"}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
