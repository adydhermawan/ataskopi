import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long'
);

const JWT_ISSUER = 'ataskopi';
const JWT_EXPIRATION = '7d'; // 7 days

export interface JwtPayload {
    sub: string; // user id
    phone: string;
    name: string;
    email?: string | null;
    // tenantId: string; // Removed for single tenant
    role: string;
    outletId?: string | null;
    iat?: number;
    exp?: number;
}

export async function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
    const token = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(JWT_ISSUER)
        .setExpirationTime(JWT_EXPIRATION)
        .sign(JWT_SECRET);

    return token;
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET, {
            issuer: JWT_ISSUER,
        });
        return payload as unknown as JwtPayload;
    } catch {
        return null;
    }
}

export function extractBearerToken(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
}
