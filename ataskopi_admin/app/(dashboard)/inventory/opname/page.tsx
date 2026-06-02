import { PageHeader } from "@/components/layout/page-header"
import { getStockOpnames } from "@/actions/stock-opname"
import { db as prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

export const dynamic = 'force-dynamic'

export default async function StockOpnamePage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let outletId = user.outletId
    if (!outletId) {
        const outlet = await prisma.outlet.findFirst()
        outletId = outlet?.id || ''
    }

    const opnames = await getStockOpnames(outletId)

    return (
        <div className="space-y-6">
            <PageHeader title="Stock Opname" />
            
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-semibold">Riwayat Stock Opname</h2>
                        <p className="text-sm text-muted-foreground">Catat dan pantau perhitungan fisik stok bahan baku.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-3 font-semibold text-slate-700">Tanggal</th>
                                <th className="p-3 font-semibold text-slate-700">Status</th>
                                <th className="p-3 font-semibold text-slate-700">Catatan</th>
                                <th className="p-3 font-semibold text-slate-700 text-right">Jumlah Item</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {opnames.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">Belum ada riwayat stock opname</td>
                                </tr>
                            ) : (
                                opnames.map((o) => (
                                    <tr key={o.id} className="hover:bg-slate-50/50">
                                        <td className="p-3 font-medium">
                                            {format(new Date(o.date), "dd MMMM yyyy", { locale: idLocale })}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${o.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="p-3">{o.notes || '-'}</td>
                                        <td className="p-3 text-right font-medium">
                                            {o.items.length} item
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
