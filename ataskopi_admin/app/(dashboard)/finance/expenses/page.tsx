import { PageHeader } from "@/components/layout/page-header"
import { getExpenses } from "@/actions/expenses"
import { db as prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let outletId = user.outletId
    if (!outletId) {
        const outlet = await prisma.outlet.findFirst()
        outletId = outlet?.id || ''
    }

    const expenses = await getExpenses(outletId)

    return (
        <div className="space-y-6">
            <PageHeader title="Pengeluaran (Expenses)" />
            
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-semibold">Riwayat Pengeluaran</h2>
                        <p className="text-sm text-muted-foreground">Catat biaya operasional dan pembelian bahan baku.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-3 font-semibold text-slate-700">Tanggal</th>
                                <th className="p-3 font-semibold text-slate-700">Kategori</th>
                                <th className="p-3 font-semibold text-slate-700">Keterangan</th>
                                <th className="p-3 font-semibold text-slate-700 text-right">Jumlah (Rp)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">Belum ada riwayat pengeluaran</td>
                                </tr>
                            ) : (
                                expenses.map((e) => (
                                    <tr key={e.id} className="hover:bg-slate-50/50">
                                        <td className="p-3 font-medium">
                                            {format(new Date(e.date), "dd MMMM yyyy", { locale: idLocale })}
                                        </td>
                                        <td className="p-3">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                                                {e.category}
                                            </span>
                                        </td>
                                        <td className="p-3">{e.description || '-'}</td>
                                        <td className="p-3 text-right font-bold text-red-600">
                                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(Number(e.amount))}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
