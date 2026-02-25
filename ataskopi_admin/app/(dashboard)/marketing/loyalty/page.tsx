import { getLoyaltySettings } from "@/actions/loyalty";
import { getTiers } from "@/actions/tiers";
import { LoyaltySettingsForm } from "./components/loyalty-settings-form";
import { TierList } from "./components/tier-list";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = 'force-dynamic'

export default async function LoyaltyPage() {
    const [settings, tiers] = await Promise.all([
        getLoyaltySettings(),
        getTiers()
    ]);

    return (
        <div className="flex-1 space-y-4">
            <PageHeader
                title="Loyalty & Rewards"
                description="Manage customer points, redemption rules, and membership levels."
            />

            <Tabs defaultValue="settings" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="settings">Points Settings</TabsTrigger>
                    <TabsTrigger value="tiers">Membership Tiers</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-4">
                    <LoyaltySettingsForm initialData={settings ? {
                        ...settings,
                        pointValueIdr: Number(settings.pointValueIdr)
                    } : null} />
                </TabsContent>

                <TabsContent value="tiers" className="space-y-4">
                    <TierList tiers={tiers} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

