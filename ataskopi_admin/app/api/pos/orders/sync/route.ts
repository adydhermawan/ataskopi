import { assertPosOutlet, withPosAuth } from '@/lib/api/pos-route';
import { successResponse, validationErrorResponse } from '@/lib/api/response-helpers';
import { PosSyncResult, syncPosOrder } from '@/lib/services/pos-order-service';
import { posSyncSchema } from '@/lib/validation/pos-schemas';

export const dynamic = 'force-dynamic';

/**
 * Orders run one at a time and in the order sent, so a rejected order does not
 * hold back the rest and the app can retry just that one.
 */
export const POST = withPosAuth(async (req) => {
    const validation = posSyncSchema.safeParse(await req.json());
    if (!validation.success) return validationErrorResponse(validation.error);

    const { outletId, orders } = validation.data;
    assertPosOutlet(req.user!, outletId);

    const results: PosSyncResult[] = [];
    for (const order of orders) {
        results.push(await syncPosOrder(order, outletId, req.user!.id));
    }
    return successResponse({ results });
});
