import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, serverErrorResponse } from '@/lib/api/response-helpers';


/**
 * @api {get} /api/promos Get active promotions/banners
 * @apiName GetPromos
 * @apiGroup Discovery
 * 
 * @apiHeader {String} x-tenant-id Tenant ID
 * 
 * @apiSuccess {Boolean} success True if request successful
 * @apiSuccess {Object[]} data List of active promos
 */
export const GET = async (req: NextRequest) => {
    try {
        const promos = await db.promo.findMany({
            where: {
                // tenantId, // Removed for Single Tenant
                isActive: true,
            },
            orderBy: {
                displayOrder: 'asc',
            },
            select: {
                id: true,
                title: true,
                description: true,
                bannerUrl: true,
                linkUrl: true,
            }
        });

        return successResponse(promos);
    } catch (error) {
        console.error('GET /api/promos error:', error);
    }
};
