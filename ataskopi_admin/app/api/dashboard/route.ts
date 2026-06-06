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
        
        const queryParams: any = {
            outletId: searchParams.get('outletId'),
        };
        
        if (searchParams.get('startDate') && searchParams.get('endDate')) {
            queryParams.startDate = searchParams.get('startDate');
            queryParams.endDate = searchParams.get('endDate');
        } else {
            queryParams.days = searchParams.get('days') || '7';
        }

        const validation = dashboardQuerySchema.safeParse(queryParams);
        if (!validation.success) {
            return validationErrorResponse(validation.error);
        }

        const { outletId, days, startDate, endDate } = validation.data;
        const user = req.user;

        if (!user) {
            return errorResponse('User not found in session', 401);
        }

        // RBAC: If kasir, lock to their outletId. If admin, use requested outletId.
        let effectiveOutletId = outletId;
        if (user.role === 'kasir' && user.outletId) {
            effectiveOutletId = user.outletId;
        }

        let start: Date;
        let end: Date;
        let label: string;

        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            label = "Custom Range";
        } else {
            end = new Date();
            start = new Date();
            start.setDate(end.getDate() - (days! - 1));
            label = `${days} Hari Terakhir`;
        }

        // Fetch data in parallel
        const [
            today,
            history,
            realRevenueHistory,
            summary,
            comparison
        ] = await Promise.all([
            DashboardService.getTodayRealtime(effectiveOutletId || null),
            DashboardService.getPeriodSummaryByDateRange(effectiveOutletId || null, start, end),
            DashboardService.getPeriodRealRevenueByDateRange(effectiveOutletId || null, start, end),
            DashboardService.getAggregatedSummary(effectiveOutletId || null, start, end),
            DashboardService.getComparisonSummary(effectiveOutletId || null, start, end)
        ]);

        const todayRealRevenue = await DashboardService.getTodayRealRevenue(effectiveOutletId || null);

        return successResponse({
            today: {
                ...today,
                realRevenue: todayRealRevenue,
            },
            summary,
            comparison,
            history,
            realRevenueHistory,
            period: {
                days,
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                label
            }
        });
    } catch (error) {
        console.error('GET /api/dashboard error:', error);
        return serverErrorResponse('Failed to fetch dashboard data');
    }
});
