import { getOrderModeSettings } from "@/actions/settings";
import { OrderModeSettingsForm } from "./components/order-mode-settings-form";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const settings = await getOrderModeSettings();

    return (
        <div className="flex-1 space-y-6">
            <PageHeader
                title="Pengaturan Layanan"
                description="Atur ketersediaan metode pemesanan (Dine In, Pick Up, dan Delivery) secara global."
            />

            <OrderModeSettingsForm initialData={settings} />
        </div>
    );
}
