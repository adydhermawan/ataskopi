import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response-helpers';

/**
 * @api {post} /api/auth/check-phone Check if phone number is registered
 * @apiName CheckPhone
 * @apiGroup Auth
 * 
 * @apiBody {String} phone Phone number to check (with +prefix)
 * @apiBody {String} [tenantId] Optional tenant ID (defaults to 'demo')
 * 
 * @apiSuccess {Boolean} success True if request successful
 * @apiSuccess {Object} data
 * @apiSuccess {Boolean} data.exists True if user exists
 * @apiSuccess {String} [data.name] User name if exists
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { phone } = body;

        if (!phone) {
            return errorResponse('Phone number is required', 400);
        }

        // Check if user exists (Single Tenant)
        const user = await db.user.findUnique({
            where: {
                phone: phone,
            },
            select: {
                id: true,
                name: true,
            }
        });

        return successResponse({
            exists: !!user,
            name: user ? user.name : null,
        });
    } catch (error) {
        console.error('API /auth/check-phone error:', error);
        return serverErrorResponse();
    }
}
