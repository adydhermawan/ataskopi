import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, AuthUser } from '@/lib/middleware/auth-middleware';
import { errorResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api/response-helpers';
import type { PosContext } from '@/lib/services/pos-order-service';
import { ServiceError } from '@/lib/services/service-error';

const POS_ROLES = ['admin', 'owner', 'kasir'];

export function posContext(user: AuthUser): PosContext {
    return {
        actorId: user.id,
        outletScope: user.role === 'kasir' ? (user.outletId ?? null) : null,
    };
}

export function assertPosOutlet(user: AuthUser, outletId: string) {
    const { outletScope } = posContext(user);
    if (outletScope && outletScope !== outletId) {
        throw new ServiceError('Tidak punya akses ke outlet ini', 403);
    }
}

/**
 * Restricts a route to staff and turns business rule failures into responses.
 */
export function withPosAuth<T>(
    handler: (req: AuthenticatedRequest, context: T) => Promise<NextResponse>
) {
    return withAuth<T>(async (req, context) => {
        if (!POS_ROLES.includes(req.user!.role)) {
            return forbiddenResponse();
        }

        try {
            return await handler(req, context);
        } catch (error) {
            if (error instanceof ServiceError) {
                return errorResponse(error.message, error.status);
            }
            console.error(`${req.method} ${req.nextUrl.pathname} error:`, error);
            return serverErrorResponse();
        }
    });
}
