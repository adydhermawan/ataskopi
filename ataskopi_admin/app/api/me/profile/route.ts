import { NextRequest } from 'next/server';
import { db as prisma } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth-middleware';
import {
    successResponse,
    errorResponse,
    serverErrorResponse,
    validationErrorResponse,
} from '@/lib/api/response-helpers';
import { updateProfileSchema } from '@/lib/validation/order-schemas';

/**
 * Handles the GET request for the current user's profile.
 * 
 * @param req - The authenticated request.
 * @returns A JSON response with user profile and loyalty summary.
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user!;

        // Fetch user profile
        const userRecord = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                currentTier: {
                    select: {
                        id: true,
                        tierName: true,
                    },
                },
            },
        });

        if (!userRecord) {
            return errorResponse('User not found', 404);
        }

        // Format response
        const response = {
            id: userRecord.id,
            phone: userRecord.phone,
            name: userRecord.name,
            email: userRecord.email,
            loyaltyPoints: userRecord.loyaltyPoints,
            totalSpent: Number(userRecord.totalSpent),
            currentTier: userRecord.currentTier,
            createdAt: userRecord.createdAt.toISOString(),
        };

        return successResponse(response);
    } catch (error) {
        console.error('GET /api/me/profile error:', error);
        return serverErrorResponse('Failed to fetch profile');
    }
});

/**
 * Handles the PATCH request to update the user's profile.
 * 
 * Allows updating 'name' and 'email'. Validates uniqueness of the new email.
 * 
 * @param req - The authenticated request with updated data.
 * @returns A JSON response with the updated profile.
 */
export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user!;
        const body = await req.json();

        // Validate request body
        const validation = updateProfileSchema.safeParse(body);
        if (!validation.success) {
            return validationErrorResponse(validation.error);
        }

        const data = validation.data;

        // Check if email is being updated and is already in use
        if (data.email) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: data.email,
                    id: { not: user.id },
                },
            });

            if (existingUser) {
                return errorResponse('Email is already in use', 400);
            }
        }

        // Update user profile
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                name: data.name,
                email: data.email,
            },
            include: {
                currentTier: {
                    select: {
                        id: true,
                        tierName: true,
                    },
                },
            },
        });

        // Format response
        const response = {
            id: updatedUser.id,
            phone: updatedUser.phone,
            name: updatedUser.name,
            email: updatedUser.email,
            loyaltyPoints: updatedUser.loyaltyPoints,
            totalSpent: Number(updatedUser.totalSpent),
            currentTier: updatedUser.currentTier,
            updatedAt: updatedUser.updatedAt.toISOString(),
        };

        return successResponse(response);
    } catch (error) {
        console.error('PATCH /api/me/profile error:', error);
        return serverErrorResponse('Failed to update profile');
    }
});
