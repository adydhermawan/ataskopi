import { assertPosOutlet, withPosAuth } from '@/lib/api/pos-route';
import { errorResponse, successResponse } from '@/lib/api/response-helpers';
import { getPosInbox } from '@/lib/services/pos-catalog-service';

export const dynamic = 'force-dynamic';

export const GET = withPosAuth(async (req) => {
    const outletId = req.nextUrl.searchParams.get('outletId');
    if (!outletId) return errorResponse('outletId wajib diisi');

    const sinceParam = req.nextUrl.searchParams.get('since');
    const since = sinceParam ? new Date(sinceParam) : undefined;
    if (since && Number.isNaN(since.getTime())) return errorResponse('since tidak valid');

    assertPosOutlet(req.user!, outletId);
    return successResponse(await getPosInbox(outletId, since));
});
