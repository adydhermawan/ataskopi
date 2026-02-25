import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt-utils';

export interface AuthUser {
    id: string;
    phone: string;
    role: string;
    outletId?: string | null;
}

export interface AuthenticatedRequest extends NextRequest {
    user?: AuthUser;
}

/**
 * Authentication middleware for API routes
 * Validates JWT token and attaches user context to request
 */
export function withAuth<T>(
    handler: (req: AuthenticatedRequest, context: T) => Promise<NextResponse>
) {
    return async (req: AuthenticatedRequest, context: T): Promise<NextResponse> => {
        try {
            // Extract token from Authorization header or cookie
            const authHeader = req.headers.get('authorization');
            let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

            if (!token) {
                token = req.cookies.get('auth_token')?.value || null;
            }

            if (!token) {
                return NextResponse.json(
                    { success: false, error: 'Missing or invalid authorization session' },
                    { status: 401 }
                );
            }

            // Verify JWT token
            const decoded = await verifyJwt(token);
            if (!decoded) {
                return NextResponse.json(
                    { success: false, error: 'Invalid or expired token' },
                    { status: 401 }
                );
            }

            // Attach user context to request
            req.user = {
                id: decoded.sub,
                phone: decoded.phone,
                role: decoded.role,
                outletId: decoded.outletId,
            };

            // Call the actual handler
            return await handler(req, context);
        } catch (error) {
            console.error('Auth middleware error:', error);
            return NextResponse.json(
                { success: false, error: 'Internal server error' },
                { status: 500 }
            );
        }
    };
}

/**
 * Optional authentication middleware
 * Attaches user context if token is present, but doesn't require it
 */
export function withOptionalAuth<T>(
    handler: (req: AuthenticatedRequest, context: T) => Promise<NextResponse>
) {
    return async (req: AuthenticatedRequest, context: T): Promise<NextResponse> => {
        try {
            const authHeader = req.headers.get('authorization');
            let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

            if (!token) {
                token = req.cookies.get('auth_token')?.value || null;
            }

            if (token) {
                const decoded = await verifyJwt(token);

                if (decoded) {
                    req.user = {
                        id: decoded.sub,
                        phone: decoded.phone,
                        role: decoded.role,
                        outletId: decoded.outletId,
                    };
                }
            }

            return await handler(req, context);
        } catch (error) {
            console.error('Optional auth middleware error:', error);
            return NextResponse.json(
                { success: false, error: 'Internal server error' },
                { status: 500 }
            );
        }
    };
}
