import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth-middleware';
import { successResponse, errorResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api/response-helpers';
import { DashboardService } from '@/lib/services/dashboard-service';
import { dashboardQuerySchema } from '@/lib/validation/dashboard-schemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard
 * Fetches dashboard data including today's real-time stats and historical summary.
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const { searchParams } = new URL(req.url);
        const queryParams = {
            outletId: searchParams.get('outletId'),
            days: searchParams.get('days') || '7',
        };

        const validation = dashboardQuerySchema.safeParse(queryParams);
        if (!validation.success) {
            return validationErrorResponse(validation.error);
        }

        const { outletId, days } = validation.data;
        const user = req.user;

        if (!user) {
            return errorResponse('User not found in session', 401);
        }

        // RBAC: If kasir, lock to their outletId. If admin, use requested outletId.
        let effectiveOutletId = outletId;
        if (user.role === 'kasir' && user.outletId) {
            effectiveOutletId = user.outletId;
        }

        // Fetch data in parallel
        const [today, history] = await Promise.all([
            DashboardService.getTodayRealtime(effectiveOutletId || null),
            DashboardService.getPeriodSummary(effectiveOutletId || null, days),
        ]);

        return successResponse({
            today,
            history,
            period: {
                days,
                startDate: history.length > 0 ? history[0].date : null,
                endDate: history.length > 0 ? history[history.length - 1].date : null,
            }
        });
    } catch (error) {
        console.error('GET /api/dashboard error:', error);
        return serverErrorResponse('Failed to fetch dashboard data');
    }
});
