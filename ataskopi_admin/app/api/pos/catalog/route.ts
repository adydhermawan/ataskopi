import { assertPosOutlet, withPosAuth } from '@/lib/api/pos-route';
import { errorResponse, successResponse } from '@/lib/api/response-helpers';
import { getPosCatalog } from '@/lib/services/pos-catalog-service';

export const dynamic = 'force-dynamic';

export const GET = withPosAuth(async (req) => {
    const outletId = req.nextUrl.searchParams.get('outletId');
    if (!outletId) return errorResponse('outletId wajib diisi');

    assertPosOutlet(req.user!, outletId);
    return successResponse(await getPosCatalog(outletId));
});
