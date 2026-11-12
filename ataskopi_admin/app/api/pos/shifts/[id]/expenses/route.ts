import { revalidatePath } from 'next/cache';
import { posContext, withPosAuth } from '@/lib/api/pos-route';
import { successResponse, validationErrorResponse } from '@/lib/api/response-helpers';
import { addShiftExpense } from '@/lib/services/pos-shift-service';
import { posShiftExpenseSchema } from '@/lib/validation/pos-schemas';

export const dynamic = 'force-dynamic';

/** A cash expense paid from the till. Returns the refreshed closing summary. */
export const POST = withPosAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const validation = posShiftExpenseSchema.safeParse(await req.json());
    if (!validation.success) return validationErrorResponse(validation.error);

    const summary = await addShiftExpense(id, validation.data, posContext(req.user!));
    revalidatePath('/finance/expenses');
    return successResponse(summary, 201);
});
