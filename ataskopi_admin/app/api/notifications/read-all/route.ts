import { db } from '@/lib/db';
import { successResponse, serverErrorResponse } from '@/lib/api/response-helpers';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth-middleware';

/**
 * @api {patch} /api/notifications/read-all Mark all notifications as read
 * @apiName MarkAllNotificationsRead
 * @apiGroup Account
 * 
 * @apiHeader {String} Authorization Bearer token
 * 
 * @apiSuccess {Boolean} success True if request successful
 * @apiSuccess {Object} data Count of updated notifications
 */
export const PATCH = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user!;

        const result = await db.notification.updateMany({
            where: {
                userId: user.id,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });

        return successResponse({
            count: result.count,
            message: `${result.count} notification(s) marked as read`
        });
    } catch (error) {
        console.error('PATCH /api/notifications/read-all error:', error);
        return serverErrorResponse();
    }
});
