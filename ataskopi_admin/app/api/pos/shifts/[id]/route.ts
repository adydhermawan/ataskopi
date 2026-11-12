import { posContext, withPosAuth } from '@/lib/api/pos-route';
import { successResponse, validationErrorResponse } from '@/lib/api/response-helpers';
import { closeShift } from '@/lib/services/pos-shift-service';
import { posCloseShiftSchema } from '@/lib/validation/pos-schemas';

export const dynamic = 'force-dynamic';

export const PATCH = withPosAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const validation = posCloseShiftSchema.safeParse(await req.json());
    if (!validation.success) return validationErrorResponse(validation.error);

    return successResponse(await closeShift(id, validation.data, posContext(req.user!)));
});
