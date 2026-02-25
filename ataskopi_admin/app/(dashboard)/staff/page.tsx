import { getStaff } from "@/actions/staff"
import { getOutlets } from "@/actions/outlets"
import { StaffClient } from "./components/staff-client"

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
    const [staff, outlets] = await Promise.all([
        getStaff(),
        getOutlets()
    ])

    return (
        <StaffClient staff={staff as any} outlets={outlets} />
    )
}
