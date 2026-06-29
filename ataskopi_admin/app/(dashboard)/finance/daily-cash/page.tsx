import { requirePermission } from "@/lib/auth-utils"
import { getOutlets } from "@/actions/outlets"
import { DailyCashClient } from "@/components/finance/daily-cash-client"

export default async function DailyCashPage() {
    const user = await requirePermission('finance', 'view')
    
    // Pass outlets for the filter, if the user is an owner they can see all,
    // if kasir/manager they might only see their assigned one
    let outlets = await getOutlets()
    
    if (user.role === 'kasir' && user.outletId) {
        outlets = outlets.filter(o => o.id === user.outletId)
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Catatan Kas Harian</h2>
            </div>
            <DailyCashClient outlets={outlets} userRole={user.role} userOutletId={user.outletId} />
        </div>
    )
}
