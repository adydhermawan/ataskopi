import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { successResponse, serverErrorResponse } from '@/lib/api/response-helpers';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        let setting = await prisma.orderModeSetting.findFirst();

        if (!setting) {
            // Seed a default row if it doesn't exist
            setting = await prisma.orderModeSetting.create({
                data: {
                    dineIn: true,
                    pickup: true,
                    delivery: true,
                    dineInMethod: 'SCAN_ONLY',
                    taxEnabled: true,
                }
            });
        }

        return successResponse({
            dineInEnabled: setting.dineIn,
            pickupEnabled: setting.pickup,
            deliveryEnabled: setting.delivery,
            dineInMethod: setting.dineInMethod,
            taxEnabled: setting.taxEnabled,
        });
    } catch (error) {
        console.error('GET /api/settings error:', error);
        return serverErrorResponse('Failed to fetch settings');
    }
}
