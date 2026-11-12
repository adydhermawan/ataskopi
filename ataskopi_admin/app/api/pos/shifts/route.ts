import { assertPosOutlet, posContext, withPosAuth } from '@/lib/api/pos-route';
import { errorResponse, successResponse, validationErrorResponse } from '@/lib/api/response-helpers';
import { getOpenShift, openShift } from '@/lib/services/pos-shift-service';
import { posOpenShiftSchema } from '@/lib/validation/pos-schemas';

export const dynamic = 'force-dynamic';

export const GET = withPosAuth(async (req) => {
    const outletId = req.nextUrl.searchParams.get('outletId');
    if (!outletId) return errorResponse('outletId wajib diisi');

    assertPosOutlet(req.user!, outletId);
    return successResponse(await getOpenShift(outletId, posContext(req.user!)));
});

export const POST = withPosAuth(async (req) => {
    const validation = posOpenShiftSchema.safeParse(await req.json());
    if (!validation.success) return validationErrorResponse(validation.error);

    assertPosOutlet(req.user!, validation.data.outletId);
    return successResponse(await openShift(validation.data, posContext(req.user!)), 201);
});
