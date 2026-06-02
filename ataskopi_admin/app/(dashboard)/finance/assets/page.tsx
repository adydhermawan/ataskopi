import { PageHeader } from "@/components/layout/page-header"
import { getAssetsROI } from "@/actions/analytics"
import { db as prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

export const dynamic = 'force-dynamic'

export default async function AssetsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let outletId = user.outletId
    if (!outletId) {
        const outlet = await prisma.outlet.findFirst()
        outletId = outlet?.id || ''
    }

    const assets = await getAssetsROI(outletId)

    return (
        <div className="space-y-6">
            <PageHeader title="Aset & Balik Modal (ROI)" />
            
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-semibold">Daftar Aset (Capital Expenditure)</h2>
                        <p className="text-sm text-muted-foreground">Pantau progres balik modal (Return on Investment) dari aset yang Anda beli.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-3 font-semibold text-slate-700">Nama Aset</th>
                                <th className="p-3 font-semibold text-slate-700">Tanggal Beli</th>
                                <th className="p-3 font-semibold text-slate-700 text-right">Harga Beli (Rp)</th>
                                <th className="p-3 font-semibold text-slate-700 text-right">Profit Terkumpul (Rp)</th>
                                <th className="p-3 font-semibold text-slate-700 text-right">Progres Balik Modal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {assets.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">Belum ada catatan aset</td>
                                </tr>
                            ) : (
                                assets.map((a) => (
                                    <tr key={a.id} className="hover:bg-slate-50/50">
                                        <td className="p-3 font-medium">{a.name}</td>
                                        <td className="p-3">
                                            {format(new Date(a.purchaseDate), "dd MMM yyyy", { locale: idLocale })}
                                        </td>
                                        <td className="p-3 text-right">
                                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(Number(a.purchasePrice))}
                                        </td>
                                        <td className="p-3 text-right text-emerald-600 font-medium">
                                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(Number(a.netProfitSince))}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${a.roiPercentage >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                                        style={{ width: `${Math.min(100, a.roiPercentage)}%` }} 
                                                    />
                                                </div>
                                                <span className="text-xs font-semibold w-10 text-right">
                                                    {a.roiPercentage.toFixed(1)}%
                                                </span>
                                            </div>
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
