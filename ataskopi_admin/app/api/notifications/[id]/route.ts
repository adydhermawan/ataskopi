import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, serverErrorResponse, notFoundResponse } from '@/lib/api/response-helpers';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth-middleware';

interface RouteContext {
    params: Promise<{ id: string }>;
}

/**
 * @api {patch} /api/notifications/:id Mark notification as read
 * @apiName MarkNotificationRead
 * @apiGroup Account
 * 
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} id Notification ID
 * 
 * @apiSuccess {Boolean} success True if request successful
 * @apiSuccess {Object} data Updated notification
 */
export const PATCH = withAuth(async (req: AuthenticatedRequest, context: RouteContext) => {
    try {
        const user = req.user!;
        const { id } = await context.params;

        // Find notification and verify ownership
        const notification = await db.notification.findFirst({
            where: {
                id,
                userId: user.id,
            },
        });

        if (!notification) {
            return notFoundResponse('Notification not found');
        }

        // Mark as read
        const updated = await db.notification.update({
            where: { id },
            data: { isRead: true },
        });

        return successResponse(updated);
    } catch (error) {
        console.error('PATCH /api/notifications/[id] error:', error);
        return serverErrorResponse();
    }
});

/**
 * @api {delete} /api/notifications/:id Delete notification
 * @apiName DeleteNotification
 * @apiGroup Account
 * 
 * @apiHeader {String} Authorization Bearer token
 * @apiParam {String} id Notification ID
 * 
 * @apiSuccess {Boolean} success True if request successful
 */
export const DELETE = withAuth(async (req: AuthenticatedRequest, context: RouteContext) => {
    try {
        const user = req.user!;
        const { id } = await context.params;

        // Find notification and verify ownership (or admin)
        const notification = await db.notification.findFirst({
            where: {
                id,
                ...(user.role === 'customer' ? { userId: user.id } : {}),
            },
        });

        if (!notification) {
            return notFoundResponse('Notification not found');
        }

        await db.notification.delete({
            where: { id },
        });

        return successResponse({ message: 'Notification deleted' });
    } catch (error) {
        console.error('DELETE /api/notifications/[id] error:', error);
        return serverErrorResponse();
    }
});
