import { getPromos } from "@/actions/promos";
import { PromoClient } from "./components/promo-client";

export const dynamic = 'force-dynamic'

export default async function PromosPage() {
    const promos = await getPromos();

    return (
        <div className="flex-1 space-y-4">
            <PromoClient data={promos} />
        </div>
    );
}
