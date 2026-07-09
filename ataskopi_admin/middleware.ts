import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt, signJwt } from '@/lib/jwt-utils';

export async function middleware(request: NextRequest) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-id',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    // Add CORS headers to all responses
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id');

    // Token refresh logic to keep session alive if active within 24 hours
    // Skip logout route so it doesn't extend session right before destroying it
    if (!request.nextUrl.pathname.startsWith('/api/auth/logout')) {
        const token = request.cookies.get('auth_token')?.value;
        if (token) {
            try {
                const decoded = await verifyJwt(token);
                if (decoded) {
                    // Check if token was issued more than 10 minutes ago to avoid signing new JWT on every request
                    const now = Math.floor(Date.now() / 1000);
                    const iat = decoded.iat || 0;
                    
                    if (now - iat > 600) {
                        const newToken = await signJwt({
                            sub: decoded.sub,
                            phone: decoded.phone,
                            name: decoded.name,
                            email: decoded.email,
                            role: decoded.role,
                            outletId: decoded.outletId
                        });
                        
                        response.cookies.set('auth_token', newToken, {
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'lax',
                            path: '/',
                            maxAge: 60 * 60 * 24 * 7 // 7 days
                        });
                    }
                }
            } catch (error) {
                // Ignore verify errors, actual routes will handle 401 if invalid
            }
        }
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
