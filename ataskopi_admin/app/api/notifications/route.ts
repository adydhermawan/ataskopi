import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, serverErrorResponse, errorResponse } from '@/lib/api/response-helpers';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth-middleware';

/**
 * @api {get} /api/notifications Get user notifications
 * @apiName GetNotifications
 * @apiGroup Account
 * 
 * @apiHeader {String} Authorization Bearer token
 * @apiQuery {String} [category] Filter by category (transaction, promo, loyalty, info)
 * 
 * @apiSuccess {Boolean} success True if request successful
 * @apiSuccess {Object[]} data List of notifications
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user!;
        const userId = user.id;
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');

        const notifications = await db.notification.findMany({
            where: {
                userId,
                ...(category && { category }),
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50,
        });

        return successResponse(notifications);
    } catch (error) {
        console.error('GET /api/notifications error:', error);
        return serverErrorResponse();
    }
});

/**
 * @api {post} /api/notifications Create notification (Admin only)
 * @apiName CreateNotification
 * @apiGroup Admin
 * 
 * @apiHeader {String} Authorization Bearer token (admin role required)
 * 
 * @apiBody {String} [userId] Target user ID (if not provided, sends to all users)
 * @apiBody {String} category Category: transaction, promo, loyalty, info
 * @apiBody {String} title Notification title
 * @apiBody {String} message Notification message
 * 
 * @apiSuccess {Boolean} success True if request successful
 * @apiSuccess {Object} data Created notification(s)
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user!;

        // Only admin/owner can create notifications
        if (!['admin', 'owner'].includes(user.role)) {
            return errorResponse('Unauthorized: Admin access required', 400);
        }

        const body = await req.json();
        const { userId, category, title, message } = body;

        // Validate required fields
        if (!category || !title || !message) {
            return errorResponse('Missing required fields: category, title, message', 400);
        }

        // Valid categories
        const validCategories = ['transaction', 'promo', 'loyalty', 'info'];
        if (!validCategories.includes(category)) {
            return errorResponse(`Invalid category. Must be one of: ${validCategories.join(', ')}`, 400);
        }

        if (userId) {
            // Send to specific user
            const notification = await db.notification.create({
                data: {
                    userId,
                    category,
                    title,
                    message,
                    isRead: false,
                },
            });
            return successResponse(notification);
        } else {
            // Send to all users
            const allUsers = await db.user.findMany({
                where: { role: 'customer' },
                select: { id: true },
            });

            const notifications = await db.notification.createMany({
                data: allUsers.map(u => ({
                    userId: u.id,
                    category,
                    title,
                    message,
                    isRead: false,
                })),
            });

            return successResponse({ count: notifications.count, message: `Notification sent to ${notifications.count} users` });
        }
    } catch (error) {
        console.error('POST /api/notifications error:', error);
        return serverErrorResponse();
    }
});
