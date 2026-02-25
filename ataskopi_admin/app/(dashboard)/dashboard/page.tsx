import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="AtasKopi Overview" />
            <DashboardClient />
        </div>
    );
}
