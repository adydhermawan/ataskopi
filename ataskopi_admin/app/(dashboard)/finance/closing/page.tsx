import { requirePermission } from "@/lib/auth-utils"
import { getOutlets } from "@/actions/outlets"
import { ClosingClient } from "@/components/finance/closing-client"
import { PageHeader } from "@/components/layout/page-header"

export const dynamic = 'force-dynamic'

export default async function ClosingPage() {
    const user = await requirePermission('finance', 'view')
    
    let outlets = await getOutlets()
    
    if (user.role === 'kasir' && user.outletId) {
        outlets = outlets.filter(o => o.id === user.outletId)
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Tutup Buku (Closing)" />
            <ClosingClient outlets={outlets} userRole={user.role} userOutletId={user.outletId} />
        </div>
    )
}
