import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth-middleware';
import { successResponse, serverErrorResponse, errorResponse } from '@/lib/api/response-helpers';
import { z } from 'zod';

const prisma = new PrismaClient();

const redeemSchema = z.object({
    voucherId: z.string().uuid()
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user!;
        const body = await req.json();

        const validation = redeemSchema.safeParse(body);
        if (!validation.success) {
            return errorResponse('Invalid input', 400);
        }

        const { voucherId } = validation.data;

        // Transaction for safety
        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch Voucher & User
            const voucher = await tx.voucher.findUnique({ where: { id: voucherId } });
            const userRecord = await tx.user.findUnique({ where: { id: user.id } });

            if (!voucher || !userRecord) throw new Error('NOT_FOUND');
            if (!voucher || !userRecord) throw new Error('NOT_FOUND');

            // 2. Validate Voucher
            const now = new Date();
            if (!voucher.isActive || !voucher.isRedeemable) throw new Error('NOT_REDEEMABLE');
            if (voucher.startDate && voucher.startDate > now) throw new Error('NOT_STARTED');
            if (voucher.endDate && voucher.endDate < now) throw new Error('EXPIRED');
            if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) throw new Error('SOLD_OUT');

            // 3. Validate Logic (Points, Tier)
            if (userRecord.loyaltyPoints < voucher.pointCost) throw new Error('INSUFFICIENT_POINTS');
            if (voucher.targetTierId && voucher.targetTierId !== userRecord.currentTierId) throw new Error('TIER_MISMATCH');

            // 4. Create UserVoucher
            const userVoucher = await tx.userVoucher.create({
                data: {
                    userId: user.id,
                    voucherId: voucher.id,
                    isUsed: false,
                    redeemedAt: new Date()
                }
            });

            // 5. Deduct Points & Log Transaction
            if (voucher.pointCost > 0) {
                await tx.user.update({
                    where: { id: user.id },
                    data: { loyaltyPoints: { decrement: voucher.pointCost } }
                });

                await tx.loyaltyTransaction.create({
                    data: {
                        userId: user.id,
                        transactionType: 'redeemed',
                        pointsChange: -voucher.pointCost,
                        pointsBalanceAfter: userRecord.loyaltyPoints - voucher.pointCost,
                        earningMethod: null,
                        notes: `Redeemed voucher: ${voucher.code}`
                    }
                });
            }

            return userVoucher;
        });

        return successResponse({
            success: true,
            message: 'Voucher redeemed successfully',
            data: result
        });

    } catch (error: any) {
        console.error('POST /api/rewards/redeem error:', error);
        if (error.message === 'INSUFFICIENT_POINTS') return errorResponse('Poin tidak cukup', 400);
        if (error.message === 'NOT_REDEEMABLE') return errorResponse('Voucher tidak dapat ditukar', 400);
        return serverErrorResponse('Failed to redeem voucher');
    }
});
