import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api/response-helpers';
import { verifyJwt, extractBearerToken } from '@/lib/jwt-utils';

export async function GET(request: NextRequest) {
    try {
        // Extract token from Authorization header or cookie
        const authHeader = request.headers.get('Authorization');
        let token = extractBearerToken(authHeader);

        if (!token) {
            token = request.cookies.get('auth_token')?.value || null;
        }

        if (!token) {
            return unauthorizedResponse('Missing or invalid authorization token');
        }

        // Verify JWT
        const payload = await verifyJwt(token);
        if (!payload) {
            return unauthorizedResponse('Invalid or expired token');
        }

        // Get user from database
        const user = await db.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                phone: true,
                name: true,
                email: true,
                role: true,
                loyaltyPoints: true,
                totalItemsPurchased: true,
                createdAt: true,
                // tenant: {
                //     select: {
                //         id: true,
                //         tenantSlug: true,
                //         businessName: true,
                //     },
                // },
            },
        });

        if (!user) {
            return unauthorizedResponse('User not found');
        }

        return successResponse(user);
    } catch (error) {
        console.error('Get me error:', error);
        return serverErrorResponse('Failed to get user profile');
    }
}
