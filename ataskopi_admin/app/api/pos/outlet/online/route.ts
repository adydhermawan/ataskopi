import { db as prisma } from '@/lib/db';
import { assertPosOutlet, withPosAuth } from '@/lib/api/pos-route';
import { successResponse, validationErrorResponse } from '@/lib/api/response-helpers';
import { posOnlineOrdersSchema } from '@/lib/validation/pos-schemas';

export const dynamic = 'force-dynamic';

export const PATCH = withPosAuth(async (req) => {
    const validation = posOnlineOrdersSchema.safeParse(await req.json());
    if (!validation.success) return validationErrorResponse(validation.error);

    const { outletId, paused } = validation.data;
    assertPosOutlet(req.user!, outletId);

    await prisma.outlet.update({
        where: { id: outletId },
        data: { onlineOrdersPaused: paused },
    });
    return successResponse({ outletId, onlineOrdersPaused: paused });
});
