import { revalidatePath } from 'next/cache';
import { posContext, withPosAuth } from '@/lib/api/pos-route';
import { successResponse, validationErrorResponse } from '@/lib/api/response-helpers';
import { addShiftPurchase } from '@/lib/services/pos-shift-service';
import { posShiftPurchaseSchema } from '@/lib/validation/pos-schemas';

export const dynamic = 'force-dynamic';

/** Cash shopping from the till. Returns the refreshed closing summary. */
export const POST = withPosAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const validation = posShiftPurchaseSchema.safeParse(await req.json());
    if (!validation.success) return validationErrorResponse(validation.error);

    const summary = await addShiftPurchase(id, validation.data, posContext(req.user!));
    revalidatePath('/inventory/purchases');
    revalidatePath('/inventory/materials');
    return successResponse(summary, 201);
});
