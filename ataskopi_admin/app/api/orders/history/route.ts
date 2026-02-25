
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth-middleware';

/**
 * GET /api/orders/history
 * Dedicated endpoint for order history (completed/cancelled)
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user;
        if (!user) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        console.log(`[HISTORY-API] Fetching history for user: ${user.id}`);

        const where: any = {
            orderStatus: { in: ['completed', 'cancelled'] }
        };

        if (user.role === 'customer') {
            where.userId = user.id;
        } else if (user.role === 'kasir' && user.outletId) {
            where.outletId = user.outletId;
        }

        const total = await db.order.count({ where });
        const orders = await db.order.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                outlet: true
            }
        });

        console.log(`[HISTORY-API] Found ${orders.length} orders`);

        // Fetch loyalty settings once for calculations
        const loyaltySetting = await db.loyaltySetting.findFirst({
            where: { isEnabled: true }
        });

        // Map to frontend expected structure with SAFE DEFAULTS
        const safeOrders = orders.map(order => {
            const status = order.orderStatus.toLowerCase();
            const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
            let earnedPoints = 0;

            if (status === 'completed') {
                earnedPoints = loyaltySetting ? totalItems * loyaltySetting.pointsPerItem : 0;
            }

            return {
                id: order.id,
                orderNumber: order.orderNumber || '',
                orderType: order.orderType || '',
                paymentStatus: order.paymentStatus || '',
                orderStatus: order.orderStatus || '',
                subtotal: Number(order.subtotal) || 0,
                tax: Number(order.tax) || 0,
                discount: Number(order.discount) || 0,
                pointsDiscount: Number(order.pointsDiscount) || 0,
                earnedPoints: earnedPoints,
                total: Number(order.total) || 0,
                createdAt: order.createdAt.toISOString(),
                paymentMethod: order.paymentMethod || null,
                items: order.items.map(item => {
                    return {
                        id: item.id,
                        productId: item.productId,
                        product: {
                            name: item.product?.name || 'Unknown Product',
                            imageUrl: item.product?.imageUrl || '',
                        },
                        quantity: item.quantity || 1,
                        unitPrice: Number(item.unitPrice) || 0,
                        notes: item.notes || '',
                        selectedOptions: [],
                        selectedModifiers: []
                    };
                }),
                outlet: order.outlet ? {
                    id: order.outlet.id,
                    name: order.outlet.name,
                    address: order.outlet.address || '',
                    phone: order.outlet.phone || '',
                    latitude: order.outlet.latitude ? Number(order.outlet.latitude) : null,
                    longitude: order.outlet.longitude ? Number(order.outlet.longitude) : null,
                } : null,
                table: null,
                deliveryAddress: null
            };
        });

        return NextResponse.json({
            success: true,
            data: safeOrders,
            pagination: {
                total,
                limit,
                offset
            }
        });

    } catch (error) {
        console.error('[HISTORY-API] Error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal Server Error' },
            { status: 500 }
        );
    }
});
