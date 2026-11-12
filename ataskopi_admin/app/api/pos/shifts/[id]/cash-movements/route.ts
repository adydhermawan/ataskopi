import { posContext, withPosAuth } from '@/lib/api/pos-route';
import { successResponse, validationErrorResponse } from '@/lib/api/response-helpers';
import { addCashMovement } from '@/lib/services/pos-shift-service';
import { posCashMovementSchema } from '@/lib/validation/pos-schemas';

export const dynamic = 'force-dynamic';

export const POST = withPosAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const validation = posCashMovementSchema.safeParse(await req.json());
    if (!validation.success) return validationErrorResponse(validation.error);

    return successResponse(await addCashMovement(id, validation.data, posContext(req.user!)));
});
