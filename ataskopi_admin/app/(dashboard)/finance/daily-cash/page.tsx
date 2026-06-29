import { requirePermission } from "@/lib/auth-utils"
import { getOutlets } from "@/actions/outlets"
import { DailyCashClient } from "@/components/finance/daily-cash-client"
import { PageHeader } from "@/components/layout/page-header"

export const dynamic = 'force-dynamic'

export default async function DailyCashPage() {
    const user = await requirePermission('finance', 'view')
    
    // Pass outlets for the filter, if the user is an owner they can see all,
    // if kasir/manager they might only see their assigned one
    let outlets = await getOutlets()
    
    if (user.role === 'kasir' && user.outletId) {
        outlets = outlets.filter(o => o.id === user.outletId)
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Catatan Kas Harian" />
            <DailyCashClient outlets={outlets} userRole={user.role} userOutletId={user.outletId} />
        </div>
    )
}
