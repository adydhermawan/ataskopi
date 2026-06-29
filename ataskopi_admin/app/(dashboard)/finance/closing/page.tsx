import { requirePermission } from "@/lib/auth-utils"
import { getOutlets } from "@/actions/outlets"
import { ClosingClient } from "@/components/finance/closing-client"

export const dynamic = 'force-dynamic'

export default async function ClosingPage() {
    const user = await requirePermission('finance', 'view')
    
    let outlets = await getOutlets()
    
    if (user.role === 'kasir' && user.outletId) {
        outlets = outlets.filter(o => o.id === user.outletId)
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Tutup Buku (Closing)</h2>
            </div>
            <ClosingClient outlets={outlets} userRole={user.role} userOutletId={user.outletId} />
        </div>
    )
}
