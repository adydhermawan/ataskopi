import { posContext, withPosAuth } from '@/lib/api/pos-route';
import { successResponse, validationErrorResponse } from '@/lib/api/response-helpers';
import { transitionOrderStatus } from '@/lib/services/order-status-service';
import { findPosOrder } from '@/lib/services/pos-order-service';
import { ServiceError } from '@/lib/services/service-error';
import { posStatusSchema } from '@/lib/validation/pos-schemas';

export const dynamic = 'force-dynamic';

export const PATCH = withPosAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const validation = posStatusSchema.safeParse(await req.json());
    if (!validation.success) return validationErrorResponse(validation.error);

    const order = await findPosOrder(id, posContext(req.user!));
    if (order.source === 'pos' && ['cancelled', 'rejected'].includes(validation.data.status)) {
        throw new ServiceError('Order kasir dibatalkan lewat void atau refund');
    }

    const result = await transitionOrderStatus({ orderId: order.id, ...validation.data, cashierCollects: true });
    return successResponse(result);
});
