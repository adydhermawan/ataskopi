import { posContext, withPosAuth } from '@/lib/api/pos-route';
import { successResponse, validationErrorResponse } from '@/lib/api/response-helpers';
import { voidPosOrder } from '@/lib/services/pos-order-service';
import { posVoidSchema } from '@/lib/validation/pos-schemas';

export const dynamic = 'force-dynamic';

export const POST = withPosAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const validation = posVoidSchema.safeParse(await req.json());
    if (!validation.success) return validationErrorResponse(validation.error);

    return successResponse(await voidPosOrder(id, validation.data.reason, posContext(req.user!)));
});
