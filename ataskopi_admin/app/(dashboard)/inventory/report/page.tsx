import { Metadata } from "next"
import { MaterialReportClient } from "@/components/inventory/material-report-client"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
    title: "Laporan Pergerakan Stok | AtasKopi",
    description: "Laporan pembelian dan penggunaan bahan baku",
}

export default async function MaterialReportPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect("/login")
    }

    if (!["admin", "owner", "kasir"].includes(user.role)) {
        redirect("/dashboard")
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Laporan Pergerakan Stok</h2>
            </div>
            <MaterialReportClient />
        </div>
    )
}
