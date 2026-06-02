import { PageHeader } from "@/components/layout/page-header"
import { getRawMaterials } from "@/actions/raw-materials"
import { db as prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function MaterialsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    // Find user's outlet or first outlet
    let outletId = user.outletId
    if (!outletId) {
        const outlet = await prisma.outlet.findFirst()
        outletId = outlet?.id || ''
    }

    const materials = await getRawMaterials(outletId)

    return (
        <div className="space-y-6">
            <PageHeader title="Bahan Baku (Raw Materials)" />
            
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-semibold">Daftar Bahan Baku</h2>
                        <p className="text-sm text-muted-foreground">Kelola stok dan harga bahan baku Anda.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-3 font-semibold text-slate-700">Nama</th>
                                <th className="p-3 font-semibold text-slate-700">SKU</th>
                                <th className="p-3 font-semibold text-slate-700">Stok Saat Ini</th>
                                <th className="p-3 font-semibold text-slate-700">Satuan</th>
                                <th className="p-3 font-semibold text-slate-700 text-right">Harga Rata-rata (Avg Cost)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {materials.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">Belum ada data bahan baku</td>
                                </tr>
                            ) : (
                                materials.map((m) => (
                                    <tr key={m.id} className="hover:bg-slate-50/50">
                                        <td className="p-3 font-medium">{m.name}</td>
                                        <td className="p-3">{m.sku || '-'}</td>
                                        <td className="p-3 font-bold">{Number(m.currentStock)}</td>
                                        <td className="p-3">{m.unit}</td>
                                        <td className="p-3 text-right">
                                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(Number(m.averageCost))}
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
