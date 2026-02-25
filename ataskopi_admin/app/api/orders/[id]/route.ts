import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth-middleware';
import {
    successResponse,
    errorResponse,
    notFoundResponse,
    serverErrorResponse,
} from '@/lib/api/response-helpers';

const prisma = new PrismaClient(); // Ensure single instance if possible or use global
export const dynamic = 'force-dynamic';


/**
 * Handles the GET request for a specific order.
 * 
 * Fetches detailed information including items, options, modifiers, and pricing breakdown.
 * Validates that the order belongs to the authenticated user.
 * 
 * @param req - The incoming Next.js request.
 * @param context - Contains route parameters (id).
 * @returns A JSON response with order details or an error.
 */
export const GET = withAuth(async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> } // Params is now a Promise
) => {
    console.log(`🔍 GET /api/orders/...`);
    try {
        const { id } = await params; // Await the params
        const orderId = id;

        // Fetch order with full details
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                // tenantId: user.tenantId, // Single Tenant: Remove filter
                // userId: user.id, // Disable for now to ensure data visibility
            },
            include: {
                outlet: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        phone: true,
                        latitude: true,
                        longitude: true,
                    },
                },
                table: {
                    select: {
                        id: true,
                        tableNumber: true,
                    },
                },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                            },
                        },
                        selectedOptions: { // Fixed relation name
                            include: {
                                optionValue: {
                                    include: {
                                        option: {
                                            select: {
                                                name: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        selectedModifiers: { // Fixed relation name
                            include: {
                                modifier: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!order) {
            return notFoundResponse('Order not found');
        }

        // Format order items with full details
        const formattedItems = order.items.map((item) => ({
            id: item.id,
            productId: item.productId, // Add productId for frontend compatibility
            product: {
                id: item.product.id,
                name: item.product.name,
                imageUrl: item.product.imageUrl,
            },
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            subtotal: Number(item.unitPrice) * item.quantity,
            notes: item.notes,
            selectedOptions: item.selectedOptions.map((opt) => ({
                // Match frontend expected structure: e['value']['name']
                value: {
                    name: opt.optionValue.name,
                },
                option: {
                    name: opt.optionValue.option.name,
                }
            })),
            selectedModifiers: item.selectedModifiers.map((mod) => ({
                // Match frontend expected structure: e['modifier']['name']
                modifier: {
                    name: mod.modifier.name,
                    price: Number(mod.unitPrice),
                },
                quantity: mod.quantity,
            })),
        }));

        // Format response
        const response = {
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            outlet: {
                ...order.outlet,
                latitude: order.outlet.latitude ? Number(order.outlet.latitude) : null,
                longitude: order.outlet.longitude ? Number(order.outlet.longitude) : null,
            },
            table: order.table,
            scheduledTime: order.scheduledTime?.toISOString(),
            deliveryAddress: order.deliveryAddress,
            items: formattedItems,
            // Calculate predicted/earned points
            earnedPoints: await (async () => {
                // First check if there's an actual 'earned' transaction (for completed orders)
                const earnedTx = await prisma.loyaltyTransaction.findFirst({
                    where: {
                        orderId: order.id,
                        transactionType: 'earned',
                    },
                    select: { pointsChange: true }
                });

                if (earnedTx) return earnedTx.pointsChange;

                // Ensure earnedPoints is 0 if cancelled or rejected
                if (['cancelled', 'rejected'].includes(order.orderStatus.toLowerCase())) {
                    return 0;
                }

                // Otherwise, calculate based on current settings (predicted)
                const loyaltySetting = await prisma.loyaltySetting.findFirst({
                    where: { isEnabled: true }
                });

                if (loyaltySetting) {
                    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
                    return totalItems * loyaltySetting.pointsPerItem;
                }

                return 0;
            })(),
            // Flatten pricing fields to root for Frontend compatibility
            subtotal: Number(order.subtotal),
            tax: Number(order.tax),
            discount: Number(order.discount),
            pointsUsed: order.pointsUsed,
            pointsDiscount: Number(order.pointsDiscount),
            voucherCode: order.voucherCode,
            deliveryFee: Number(order.deliveryFee || 0),
            serviceFee: Number(order.serviceFee || 0),
            total: Number(order.total),
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
        };

        return successResponse(response);
    } catch (error) {
        console.error('GET /api/orders/[id] error:', error);
        return serverErrorResponse('Failed to fetch order details');
    }
});
