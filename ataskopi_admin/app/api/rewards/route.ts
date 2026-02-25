import { NextRequest } from 'next/server';
import { db as prisma } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth-middleware';
import { successResponse, serverErrorResponse, errorResponse } from '@/lib/api/response-helpers';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user!;
        const now = new Date();

        // Fetch redeemable vouchers
        const rewards = await prisma.voucher.findMany({
            where: {
                isRedeemable: true,
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now }
            },
            include: {
                targetTier: true
            },
            orderBy: {
                pointCost: 'asc'
            }
        });

        // Check which ones user can afford or is eligible for
        const userRecord = await prisma.user.findUnique({
            where: { id: user.id },
            select: { loyaltyPoints: true, currentTierId: true }
        });

        if (!userRecord) return errorResponse('User not found', 404);

        const formattedRewards = rewards.map(r => {
            const isAffordable = userRecord.loyaltyPoints >= (r.pointCost || 0);
            const isTierEligible = !r.targetTierId || r.targetTierId === userRecord.currentTierId;

            return {
                id: r.id,
                code: r.code,
                name: r.code, // Assuming code as name similar to screenshot
                description: r.description,
                pointCost: r.pointCost,
                discountValue: Number(r.discountValue),
                discountType: r.discountType,
                isAffordable,
                isTierEligible,
                targetTier: r.targetTier?.tierName
            };
        });

        return successResponse({ rewards: formattedRewards });

    } catch (error) {
        console.error('GET /api/rewards error:', error);
        return serverErrorResponse('Failed to fetch rewards');
    }
});
