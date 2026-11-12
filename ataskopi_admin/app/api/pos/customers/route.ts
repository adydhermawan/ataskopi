import { db as prisma } from '@/lib/db';
import { withPosAuth } from '@/lib/api/pos-route';
import { errorResponse, notFoundResponse, successResponse } from '@/lib/api/response-helpers';

export const dynamic = 'force-dynamic';

export const GET = withPosAuth(async (req) => {
    const phone = req.nextUrl.searchParams.get('phone');
    if (!phone) return errorResponse('phone wajib diisi');

    const customer = await prisma.user.findFirst({
        where: { phone, role: 'customer' },
        select: { id: true, name: true, phone: true, loyaltyPoints: true },
    });
    if (!customer) return notFoundResponse('Customer');

    return successResponse(customer);
});
