import { revalidatePath } from 'next/cache';
import { posContext, withPosAuth } from '@/lib/api/pos-route';
import { successResponse } from '@/lib/api/response-helpers';
import { deleteShiftExpense } from '@/lib/services/pos-shift-service';

export const dynamic = 'force-dynamic';

export const DELETE = withPosAuth(
    async (req, { params }: { params: Promise<{ id: string; expenseId: string }> }) => {
        const { id, expenseId } = await params;
        const summary = await deleteShiftExpense(id, expenseId, posContext(req.user!));
        revalidatePath('/finance/expenses');
        return successResponse(summary);
    }
);
