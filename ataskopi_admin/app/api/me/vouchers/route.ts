import { NextRequest } from 'next/server';
import { db as prisma } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth-middleware';
import {
    successResponse,
    errorResponse,
    serverErrorResponse,
    validationErrorResponse,
} from '@/lib/api/response-helpers';
import { voucherQuerySchema } from '@/lib/validation/order-schemas';

/**
 * Handles the GET request for available vouchers for the user.
 * 
 * Filters vouchers based on their status (available, upcoming, expired) and 
 * checks eligibility based on user's current loyalty tier.
 * 
 * @param req - The authenticated request.
 * @returns A JSON response with a list of vouchers and a summary.
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user!;
        const now = new Date();

        // Fetch user to check tier
        const userRecord = await prisma.user.findUnique({
            where: { id: user.id },
            select: { currentTierId: true },
        });

        if (!userRecord) {
            return errorResponse('User not found', 404);
        }

        // Fetch ALL active vouchers eligible for this user
        const vouchers = await prisma.voucher.findMany({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
                OR: [
                    { targetTierId: null },
                    { targetTierId: userRecord.currentTierId },
                ]
            },
            include: {
                targetTier: true
            },
            orderBy: {
                endDate: 'asc',
            },
        });

        // 2. Fetch User Stats for Eligibility Checks
        const userOrderCount = await prisma.order.count({
            where: {
                userId: user.id,
                orderStatus: { not: 'cancelled' } // Only count valid orders
            }
        });



        const voucherIds = vouchers.map(v => v.id);

        // 3. Fetch User's Voucher Usage
        const userVoucherUsage = await prisma.userVoucher.groupBy({
            by: ['voucherId'],
            where: {
                userId: user.id,
                voucherId: { in: voucherIds },
                isUsed: true
            },
            _count: {
                _all: true
            }
        });

        // Create usage map for O(1) lookup
        const usageMap = new Map();
        userVoucherUsage.forEach(usage => {
            usageMap.set(usage.voucherId, usage._count._all);
        });

        // 4. Filter & Format Vouchers
        const formattedVouchers = vouchers.filter(v => {
            // Check Global Usage Limit


            // Check User Usage Limit
            if (v.userUsageLimit) {
                const usedCount = usageMap.get(v.id) || 0;

            }

            // Check Customer Eligibility
            if (v.customerEligibility === 'NEW_USER' && userOrderCount > 0) {

                return false;
            }

            if (v.customerEligibility === 'SPECIFIC_USER') {
                const eligibleIds = v.eligibleUserIds as string[] || [];
                if (!eligibleIds.includes(user.id)) {

                    return false;
                }
            }

            return true;
        }).map((v) => {
            let discountDisplay = '';
            // Handle new Percent/Percentage enum fix
            const type = v.discountType.toUpperCase();
            if (type === 'PERCENT' || type === 'PERCENTAGE') {
                discountDisplay = `${Number(v.discountValue)}% OFF`;
            } else {
                discountDisplay = `Rp ${Number(v.discountValue).toLocaleString('id-ID')} OFF`;
            }

            return {
                id: v.id,
                code: v.code,
                name: v.code,
                description: v.description,
                discountType: v.discountType,
                discountValue: Number(v.discountValue),
                minOrder: v.minOrder ? Number(v.minOrder) : 0,
                maxDiscount: v.maxDiscount ? Number(v.maxDiscount) : null,
                discountDisplay,
                pointCost: v.pointCost || 0,
                status: 'active',
                isRedeemable: v.isRedeemable,
                validUntil: v.endDate,
                usageLimit: v.usageLimit,
                termsAndConditions: [
                    v.minOrder ? `Min. Order Rp ${Number(v.minOrder).toLocaleString('id-ID')}` : null,
                    v.targetTier ? `Khusus member ${v.targetTier.tierName}` : null,
                    v.usageLimit ? 'Kuota terbatas' : null,
                    v.customerEligibility === 'NEW_USER' ? 'Khusus pengguna baru' : null,
                ].filter(Boolean)
            };
        });

        return successResponse({
            vouchers: formattedVouchers,
            count: formattedVouchers.length
        });
    } catch (error) {
        console.error('GET /api/me/vouchers error:', error);
        return serverErrorResponse('Failed to fetch vouchers');
    }
});
