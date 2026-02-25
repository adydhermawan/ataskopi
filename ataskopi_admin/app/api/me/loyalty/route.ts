import { NextRequest } from 'next/server';
import { db as prisma } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth-middleware';
import {
    successResponse,
    errorResponse,
    serverErrorResponse,
} from '@/lib/api/response-helpers';

/**
 * Handles the GET request for current user's loyalty information.
 * 
 * Calculates points, current tier, and progress to the next tier.
 * Includes a history of recent loyalty transactions.
 * 
 * @param req - The authenticated request.
 * @returns A JSON response with loyalty status.
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user!;


        // Fetch user with tier
        const userRecord = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                currentTier: true,
            },
        });

        if (!userRecord) {

            return errorResponse('User not found', 404);
        }



        // Fetch loyalty settings - Single Tenant (get first record)
        const loyaltySettings = await prisma.loyaltySetting.findFirst();

        if (!loyaltySettings) {
            return errorResponse('Loyalty program not configured', 404);
        }

        // Fetch all tiers
        const tiers = await prisma.membershipTier.findMany({
            orderBy: { minPoints: 'asc' },
        });

        // Fetch recent loyalty transactions
        const recentTransactions = await prisma.loyaltyTransaction.findMany({
            where: {
                userId: user.id,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                order: {
                    select: {
                        orderNumber: true,
                    },
                },
            },
        });

        // AUTO-UPDATE: Check if user's tier matches their points and update if needed
        // We use loyaltyPoints (balance) as the metric per user expectation "Min Poin"
        // This means redeeming points could demote the user, which is a specific model choice.

        let currentTierId = userRecord.currentTierId;
        const currentPoints = userRecord.loyaltyPoints;

        // Find the correct tier based on current points
        let appropriateTier = tiers[0]; // Default to lowest
        for (const tier of tiers) {
            if (currentPoints >= tier.minPoints) {
                appropriateTier = tier;
            } else {
                break; // Ordered by minPoints ASC, so stop when we don't qualify
            }
        }

        // If calculated tier is different from db tier, update it
        if (appropriateTier.id !== currentTierId) {


            await prisma.user.update({
                where: { id: user.id },
                data: { currentTierId: appropriateTier.id }
            });

            // Update local state for response
            currentTierId = appropriateTier.id;
            userRecord.currentTier = appropriateTier;
        }

        // Calculate next tier progress
        const currentTierIndex = tiers.findIndex((t) => t.id === currentTierId);
        const nextTier = currentTierIndex >= 0 && currentTierIndex < tiers.length - 1
            ? tiers[currentTierIndex + 1]
            : null;

        let progressToNextTier = null;
        if (nextTier) {
            const currentPoints = userRecord.loyaltyPoints;
            const nextTierMinPoints = nextTier.minPoints;
            const currentTierMinPoints = userRecord.currentTier
                ? userRecord.currentTier.minPoints
                : 0;

            const tierRange = nextTierMinPoints - currentTierMinPoints;
            const userProgress = currentPoints - currentTierMinPoints;
            const progressPercentage = tierRange > 0 ? (userProgress / tierRange) * 100 : 0;

            progressToNextTier = {
                nextTier: {
                    id: nextTier.id,
                    name: nextTier.tierName,
                    minSpend: nextTier.minPoints,
                    benefits: nextTier.benefitsDescription,
                },
                currentSpend: currentPoints, // Sending points as spend for frontend compat
                remainingSpend: Math.max(0, nextTierMinPoints - currentPoints),
                progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
            };
        }

        // Format response
        const response = {
            loyaltyPoints: userRecord.loyaltyPoints,
            totalSpent: Number(userRecord.totalSpent),
            currentTier: userRecord.currentTier
                ? {
                    id: userRecord.currentTier.id,
                    name: userRecord.currentTier.tierName,
                    benefits: userRecord.currentTier.benefitsDescription,
                    minSpend: userRecord.currentTier.minPoints,
                }
                : null,
            progressToNextTier,
            allTiers: tiers.map((tier) => ({
                id: tier.id,
                name: tier.tierName,
                minSpend: tier.minPoints,
                benefits: tier.benefitsDescription,
                isCurrentTier: tier.id === currentTierId,
            })),
            loyaltySettings: {
                isEnabled: loyaltySettings.isEnabled,
                pointsPerIdr: Number(loyaltySettings.pointValueIdr), // Check usage
                pointValueIdr: Number(loyaltySettings.pointValueIdr),
                minPointsToRedeem: loyaltySettings.minPointsToRedeem,
                maxPointsPerTransaction: loyaltySettings.maxPointsPerTransaction,
                maxRedemptionPercentage: loyaltySettings.maxRedemptionPercentage,
            },
            recentTransactions: recentTransactions.map((tx) => ({
                id: tx.id,
                transactionType: tx.transactionType,
                pointsChange: tx.pointsChange,
                pointsBalanceAfter: tx.pointsBalanceAfter,
                notes: tx.notes,
                orderNumber: tx.order?.orderNumber,
                createdAt: tx.createdAt.toISOString(),
            })),
        };

        return successResponse(response);
    } catch (error) {
        console.error('GET /api/me/loyalty error:', error);
        return serverErrorResponse('Failed to fetch loyalty information');
    }
});
