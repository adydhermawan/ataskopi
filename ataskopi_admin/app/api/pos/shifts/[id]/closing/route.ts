import { posContext, withPosAuth } from '@/lib/api/pos-route';
import { successResponse } from '@/lib/api/response-helpers';
import { getClosingSummary } from '@/lib/services/pos-shift-service';

export const dynamic = 'force-dynamic';

/** Figures for the closing form, read just before the shift is closed. */
export const GET = withPosAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return successResponse(await getClosingSummary(id, posContext(req.user!)));
});
