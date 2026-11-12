import { posContext, withPosAuth } from '@/lib/api/pos-route';
import { successResponse, validationErrorResponse } from '@/lib/api/response-helpers';
import { recordPosPayment } from '@/lib/services/pos-order-service';
import { posPaymentSchema } from '@/lib/validation/pos-schemas';

export const dynamic = 'force-dynamic';

export const POST = withPosAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const validation = posPaymentSchema.safeParse(await req.json());
    if (!validation.success) return validationErrorResponse(validation.error);

    return successResponse(await recordPosPayment(id, validation.data, posContext(req.user!)));
});
