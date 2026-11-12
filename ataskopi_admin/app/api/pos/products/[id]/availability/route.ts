import { db as prisma } from '@/lib/db';
import { assertPosOutlet, withPosAuth } from '@/lib/api/pos-route';
import { successResponse, validationErrorResponse } from '@/lib/api/response-helpers';
import { posAvailabilitySchema } from '@/lib/validation/pos-schemas';

export const dynamic = 'force-dynamic';

export const PATCH = withPosAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const validation = posAvailabilitySchema.safeParse(await req.json());
    if (!validation.success) return validationErrorResponse(validation.error);

    const { outletId, isAvailable } = validation.data;
    assertPosOutlet(req.user!, outletId);

    await prisma.outletProduct.upsert({
        where: { outletId_productId: { outletId, productId: id } },
        create: { outletId, productId: id, isAvailable },
        update: { isAvailable },
    });
    return successResponse({ productId: id, outletId, isAvailable });
});
