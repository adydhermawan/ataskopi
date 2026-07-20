import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt, signJwt } from '@/lib/jwt-utils';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login'];
const PUBLIC_PREFIXES = ['/api/', '/_next/', '/images/', '/icons/'];

function isPublicRoute(pathname: string): boolean {
    if (PUBLIC_ROUTES.includes(pathname)) return true;
    return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

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

    // --- Auth Guard Logic ---
    const token = request.cookies.get('auth_token')?.value;
    let decoded = null;

    if (token) {
        try {
            decoded = await verifyJwt(token);
        } catch {
            // Token is invalid/expired
        }
    }

    const isLogin = pathname === '/login';
    const isPublic = isPublicRoute(pathname);

    // User sudah login (token valid) tapi akses /login → redirect ke dashboard
    if (decoded && isLogin) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // User belum login / token invalid → akses protected route → redirect ke login
    if (!decoded && !isPublic) {
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        // Bersihkan cookie yang invalid/expired
        if (token) {
            response.cookies.delete('auth_token');
        }
        return response;
    }

    // --- End Auth Guard ---

    // Add CORS headers to all responses
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id');

    // Token refresh logic to keep session alive if active within 24 hours
    // Skip logout route so it doesn't extend session right before destroying it
    if (decoded && !pathname.startsWith('/api/auth/logout')) {
        // Check if token was issued more than 10 minutes ago to avoid signing new JWT on every request
        const now = Math.floor(Date.now() / 1000);
        const iat = decoded.iat || 0;

        if (now - iat > 600) {
            try {
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
            } catch {
                // Ignore sign errors
            }
        }
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
