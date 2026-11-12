import { revalidatePath } from 'next/cache';
import { posContext, withPosAuth } from '@/lib/api/pos-route';
import { successResponse } from '@/lib/api/response-helpers';
import { deleteShiftPurchase } from '@/lib/services/pos-shift-service';

export const dynamic = 'force-dynamic';

export const DELETE = withPosAuth(
    async (req, { params }: { params: Promise<{ id: string; purchaseId: string }> }) => {
        const { id, purchaseId } = await params;
        const summary = await deleteShiftPurchase(id, purchaseId, posContext(req.user!));
        revalidatePath('/inventory/purchases');
        revalidatePath('/inventory/materials');
        return successResponse(summary);
    }
);
