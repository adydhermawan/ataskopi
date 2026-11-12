import { posContext, withPosAuth } from '@/lib/api/pos-route';
import { successResponse, validationErrorResponse } from '@/lib/api/response-helpers';
import { refundPosOrder } from '@/lib/services/pos-order-service';
import { posRefundSchema } from '@/lib/validation/pos-schemas';

export const dynamic = 'force-dynamic';

export const POST = withPosAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const validation = posRefundSchema.safeParse(await req.json());
    if (!validation.success) return validationErrorResponse(validation.error);

    return successResponse(await refundPosOrder(id, validation.data, posContext(req.user!)));
});
