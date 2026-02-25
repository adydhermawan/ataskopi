import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response-helpers';
import { signJwt } from '@/lib/jwt-utils';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        // Force single-tenant architecture
        const { phone, name, email, pin } = body;

        // Validation
        if (!phone || !name || !pin) {
            return errorResponse('Phone, name, and PIN are required', 400);
        }

        if (pin.length !== 6 || !/^\d+$/.test(pin)) {
            return errorResponse('PIN must be exactly 6 digits', 400);
        }

        // Check if user already exists
        const existingUser = await db.user.findUnique({
            where: {
                phone,
            },
        });

        if (existingUser) {
            return errorResponse('Phone number already registered', 409);
        }

        // Hash PIN
        const pinHash = await bcrypt.hash(pin, 10);

        // Find default tier (lowest level)
        const defaultTier = await db.membershipTier.findFirst({
            orderBy: { tierLevel: 'asc' }
        });

        // Create user
        const user = await db.user.create({
            data: {
                phone,
                name,
                email,
                pinHash,
                role: 'customer',
                currentTierId: defaultTier?.id, // Assign default tier
            },
        });

        // Generate JWT
        const token = await signJwt({
            sub: user.id,
            phone: user.phone,
            name: user.name,
            role: user.role,
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

        return successResponse(
            {
                user: {
                    id: user.id,
                    phone: user.phone,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                token,
            },
            201
        );
    } catch (error) {
        console.error('Register error:', error);
        return serverErrorResponse('Failed to register user');
    }
}
