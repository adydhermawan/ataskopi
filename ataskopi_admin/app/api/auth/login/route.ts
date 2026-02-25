import { NextRequest } from 'next/server';
import { db as prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signJwt } from '@/lib/jwt-utils';
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/api/response-helpers';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phone, pin } = body;

        if (!phone || !pin) {
            return errorResponse('Phone and PIN are required', 400);
        }

        // Find user by phone (Single Tenant)
        const user = await prisma.user.findUnique({
            where: {
                phone,
            }
        });

        if (!user) {
            return unauthorizedResponse('Invalid credentials');
        }

        // Verify PIN
        if (!user.pinHash) {
            return errorResponse('User has no PIN set', 400);
        }

        const isValidPin = await bcrypt.compare(pin, user.pinHash);

        if (!isValidPin) {
            return unauthorizedResponse('Invalid credentials');
        }

        // Generate JWT
        const token = await signJwt({
            sub: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            role: user.role,
            outletId: user.outletId
        });

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return successResponse({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                outletId: user.outletId
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        return serverErrorResponse();
    }
}
