import { NextRequest } from 'next/server';
import { db as prisma } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth-middleware';
import {
    successResponse,
    errorResponse,
    validationErrorResponse,
    serverErrorResponse,
    paginatedResponse,
} from '@/lib/api/response-helpers';
import { createOrderSchema, orderQuerySchema } from '@/lib/validation/order-schemas';
import { notifyOrderCreated } from '@/lib/services/notification-service';
export const dynamic = 'force-dynamic';


/**
 * Handles the POST request for creating a new order.
 * 
 * This is a complex endpoint that performs:
 * 1. Request validation (order type, items).
 * 2. Tenant and User context verification.
 * 3. Business logic validation (table existence, outlet status, voucher validity).
 * 4. Multi-step price calculation (options, modifiers, vouchers, points, tax).
 * 5. Atomic database transaction to create order and update related records.
 * 
 * @param req - The incoming Next.js request with order data.
 * @returns A JSON response with the created order or a detailed error message.
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const body = await req.json();


        // Validate request body
        const validation = createOrderSchema.safeParse(body);
        if (!validation.success) {
            return validationErrorResponse(validation.error);
        }

        const data = validation.data;

        const user = req.user!;

        // Verify user exists (Single Tenant)
        const userRecord = await prisma.user.findUnique({
            where: { id: user.id },
            include: { currentTier: true },
        });

        if (!userRecord) {
            return errorResponse('User not found', 403);
        }

        // Verify outlet exists
        const outlet = await prisma.outlet.findFirst({
            where: {
                id: data.outletId,
                isActive: true,
            },
        });

        if (!outlet) {
            return errorResponse('Outlet not found or inactive', 404);
        }

        // Validate order type specific requirements
        if (data.orderType === 'dine_in' && data.tableId) {
            const table = await prisma.table.findFirst({
                where: {
                    id: data.tableId,
                    outletId: data.outletId,
                },
            });

            if (!table) {
                return errorResponse('Table not found', 404);
            }

            if (table.isOccupied) {
                return errorResponse('Table is already occupied', 400);
            }
        }

        if (data.orderType === 'pickup' && data.scheduledTime) {
            const scheduledDate = new Date(data.scheduledTime);
            const minTime = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes from now

            if (scheduledDate < minTime) {
                return errorResponse('Scheduled time must be at least 20 minutes from now', 400);
            }
        }

        // CALCULATE ORDER PRICING
        let subtotal = 0;
        const orderItems: any[] = [];

        for (const item of data.items) {
            const product = await prisma.product.findFirst({
                where: {
                    id: item.productId,
                    isAvailable: true,
                },
                include: {
                    options: {
                        include: { values: true },
                    },
                    modifiers: true,
                },
            });

            if (!product) {
                return errorResponse(`Product ${item.productId} not found or unavailable`, 404);
            }

            let itemPrice = Number(product.basePrice);

            // Add option price modifiers
            if (item.selectedOptions) {
                for (const selectedOption of item.selectedOptions) {
                    const option = product.options.find((o) => o.id === selectedOption.optionId);
                    if (!option) {
                        return errorResponse(`Invalid option ${selectedOption.optionId}`, 400);
                    }

                    const value = option.values.find((v) => v.id === selectedOption.valueId);
                    if (!value) {
                        return errorResponse(`Invalid option value ${selectedOption.valueId}`, 400);
                    }

                    itemPrice += Number(value.priceModifier);
                }
            }

            // Add modifier prices
            const itemModifiers: any[] = [];
            if (item.selectedModifiers) {
                for (const selectedModifier of item.selectedModifiers) {
                    const modifier = product.modifiers.find((m) => m.id === selectedModifier.modifierId);
                    if (!modifier || !modifier.isAvailable) {
                        return errorResponse(`Invalid or unavailable modifier ${selectedModifier.modifierId}`, 400);
                    }

                    const modifierPrice = Number(modifier.price) * selectedModifier.quantity;
                    itemPrice += modifierPrice;

                    itemModifiers.push({
                        modifierId: modifier.id,
                        quantity: selectedModifier.quantity,
                        unitPrice: Number(modifier.price),
                    });
                }
            }

            const itemSubtotal = itemPrice * item.quantity;
            subtotal += itemSubtotal;

            orderItems.push({
                productId: product.id,
                categoryId: product.categoryId,
                quantity: item.quantity,
                unitPrice: itemPrice,
                notes: item.notes,
                selectedOptions: item.selectedOptions || [],
                selectedModifiers: itemModifiers,
            });
        }

        // Apply voucher discount
        let discount = 0;
        let voucherId: string | null = null; // Defined in scope

        if (data.voucherCode) {
            const { validateVoucher } = await import('@/lib/services/voucher-service');

            // Map items for validation service
            // Note: categoryId was added to orderItems in previous steps
            const cartItemsForValidation = orderItems.map((item: any) => ({
                productId: item.productId,
                categoryId: item.categoryId,
                price: item.unitPrice * item.quantity,
                quantity: item.quantity
            }));

            const validationResult = await validateVoucher(
                data.voucherCode,
                user.id,
                subtotal,
                data.orderType,
                cartItemsForValidation
            );

            if (!validationResult.valid) {
                // Return specific validation error for frontend to display nicely
                return errorResponse(validationResult.error || 'Voucher tidak valid', 400);
            }

            discount = validationResult.discount;

            // WIN: Fetch voucher ID for the transaction step later
            const Voucher = await prisma.voucher.findUnique({
                where: { code: data.voucherCode },
                select: { id: true }
            });
            voucherId = Voucher?.id || null;
        }
        let pointsDiscount = 0;
        let pointsUsed = 0;
        if (data.pointsToRedeem && data.pointsToRedeem > 0) {
            const loyaltySettings = await prisma.loyaltySetting.findFirst({
                where: { isEnabled: true }, // Single tenant: find first enabled
            });

            if (!loyaltySettings || !loyaltySettings.isEnabled) {
                return errorResponse('Loyalty program is not enabled', 400);
            }

            if (data.pointsToRedeem < loyaltySettings.minPointsToRedeem) {
                return errorResponse(`Minimum ${loyaltySettings.minPointsToRedeem} points required to redeem`, 400);
            }

            if (data.pointsToRedeem > userRecord.loyaltyPoints) {
                return errorResponse('Insufficient loyalty points', 400);
            }

            if (loyaltySettings.maxPointsPerTransaction && data.pointsToRedeem > loyaltySettings.maxPointsPerTransaction) {
                return errorResponse(`Maximum ${loyaltySettings.maxPointsPerTransaction} points per transaction`, 400);
            }

            pointsUsed = data.pointsToRedeem;
            pointsDiscount = pointsUsed * Number(loyaltySettings.pointValueIdr);
        }

        // Calculate tax and total
        const taxRate = 0.11; // 11% PPN
        const tax = subtotal * taxRate;
        const total = subtotal + tax - discount - pointsDiscount;

        if (total < 0) {
            return errorResponse('Invalid order total', 400);
        }

        // Generate order number
        const today = new Date();
        const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6); // DDMMYY
        const outletPrefix = outlet.id.slice(0, 4);

        const lastOrder = await prisma.order.findFirst({
            where: {
                outletId: outlet.id,
                orderNumber: {
                    startsWith: `${outletPrefix}${dateStr}`,
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        let sequence = 1;
        if (lastOrder) {
            const lastSeq = parseInt(lastOrder.orderNumber.split('-')[1] || '0');
            sequence = lastSeq + 1;
        }

        const orderNumber = `${outletPrefix}${dateStr}-${sequence.toString().padStart(3, '0')}`;

        // Create order in transaction
        const order = await prisma.$transaction(async (tx) => {
            // Create order
            const newOrder = await tx.order.create({
                data: {
                    userId: user.id,
                    outletId: outlet.id,
                    tableId: data.tableId,
                    orderNumber,
                    orderType: data.orderType,
                    scheduledTime: data.scheduledTime ? new Date(data.scheduledTime) : null,
                    deliveryAddress: data.deliveryAddress,
                    subtotal,
                    tax,
                    discount,
                    pointsUsed,
                    pointsDiscount,
                    voucherCode: data.voucherCode,
                    total,
                    paymentMethod: data.paymentMethod,
                    paymentStatus: 'pending',
                    orderStatus: 'pending',
                },
            });

            // Create order items
            for (const item of orderItems) {
                const orderItem = await tx.orderItem.create({
                    data: {
                        orderId: newOrder.id,
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        notes: item.notes,
                    },
                });

                // Create order item options
                if (Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0) {
                    await tx.orderItemOption.createMany({
                        data: item.selectedOptions.map((opt: any) => ({
                            orderItemId: orderItem.id,
                            optionValueId: opt.valueId,
                        })),
                    });
                }

                // Create order item modifiers
                if (Array.isArray(item.selectedModifiers) && item.selectedModifiers.length > 0) {
                    await tx.orderItemModifier.createMany({
                        data: item.selectedModifiers.map((mod: any) => ({
                            orderItemId: orderItem.id,
                            modifierId: mod.modifierId,
                            quantity: mod.quantity,
                            unitPrice: mod.unitPrice,
                        })),
                    });
                }
            }

            // Deduct loyalty points if redeemed
            if (pointsUsed > 0) {
                await tx.user.update({
                    where: { id: user.id },
                    data: {
                        loyaltyPoints: { decrement: pointsUsed },
                    },
                });

                // Create loyalty transaction record
                await tx.loyaltyTransaction.create({
                    data: {
                        userId: user.id,
                        orderId: newOrder.id,
                        transactionType: 'redeemed',
                        pointsChange: -pointsUsed,
                        pointsBalanceAfter: userRecord.loyaltyPoints - pointsUsed,
                        notes: `Redeemed ${pointsUsed} points for order ${orderNumber}`,
                    },
                });
            }

            // Update voucher used count
            // Update voucher used count AND Record User Usage
            if (data.voucherCode && voucherId) {
                // 1. Increment global count
                await tx.voucher.update({
                    where: { id: voucherId },
                    data: { usedCount: { increment: 1 } },
                });

                // 2. Track user usage (Crucial for user usage limits)
                await tx.userVoucher.create({
                    data: {
                        userId: user.id,
                        voucherId: voucherId,
                        isUsed: true,
                        orderId: newOrder.id,
                        redeemedAt: new Date(),
                        usedAt: new Date(),
                    }
                });
            }

            // Mark table as occupied (dine-in only)
            if (data.orderType === 'dine_in' && data.tableId) {
                await tx.table.update({
                    where: { id: data.tableId },
                    data: { isOccupied: true },
                });
            }

            return newOrder;
        });

        // Trigger notification for order creation (outside transaction)
        await notifyOrderCreated(user.id, order.orderNumber);

        // Return created order
        return successResponse({
            id: order.id,
            orderNumber: order.orderNumber,
            subtotal: Number(order.subtotal),
            tax: Number(order.tax),
            discount: Number(order.discount),
            pointsDiscount: Number(order.pointsDiscount),
            total: Number(order.total),
            paymentStatus: order.paymentStatus,
            orderStatus: order.orderStatus,
            createdAt: order.createdAt.toISOString(),
        }, 201);
    } catch (error) {
        console.error('POST /api/orders error:', error);
        return serverErrorResponse(`Failed to create order: ${error instanceof Error ? error.message : String(error)}`);
    }
});

/**
 * Handles the GET request for listing user's order history.
 * 
 * Supports filtering by 'active' (pending/preparing/ready) or 'completed' status.
 * Results are paginated and ordered by creation date descending.
 * 
 * @param req - The incoming Next.js request.
 * @returns A paginated JSON response with order history.
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user!;
        const { searchParams } = new URL(req.url);

        const queryParams = {
            status: searchParams.get('status') || undefined,
            limit: searchParams.get('limit') || '20',
            offset: searchParams.get('offset') || '0',
        };

        const validation = orderQuerySchema.safeParse(queryParams);
        if (!validation.success) {
            return validationErrorResponse(validation.error);
        }

        const limit = parseInt(queryParams.limit);
        const offset = parseInt(queryParams.offset);

        // Build where clause
        const where: any = {};

        // RBAC: Customers only see their own orders. Staff see all/outlet-specific.
        if (user.role === 'customer') {
            where.userId = user.id;
        } else if (user.role === 'kasir' && user.outletId) {
            where.outletId = user.outletId;
        }
        // Admin or global staff (outletId null) see all, so no extra filter needed.

        if (queryParams.status) {
            const statuses = queryParams.status.split(',').map((s) => s.trim());


            // Handle logical grouping if needed, otherwise use raw statuses
            if (statuses.includes('active')) {
                where.orderStatus = { in: ['pending', 'preparing', 'ready', 'waiting_pickup', 'on_the_way'] };
            } else if (statuses.includes('completed')) {
                where.orderStatus = { in: ['completed', 'cancelled'] };
            } else {
                // Use raw statuses provided by frontend (e.g. "pending,preparing")
                where.orderStatus = { in: statuses };
            }
        }



        // Get total count
        const total = await prisma.order.count({ where });


        // Fetch orders
        const orders = await prisma.order.findMany({
            where,
            include: {
                outlet: {
                    select: {
                        id: true,
                        name: true,
                        latitude: true,
                        longitude: true,
                    },
                },
                items: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            skip: offset,
        });

        // Fetch loyalty settings once for calculations
        const loyaltySetting = await prisma.loyaltySetting.findFirst({
            where: { isEnabled: true }
        });

        // Format response
        const formattedOrders = orders.map((order) => {
            const status = order.orderStatus.toLowerCase();
            const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
            let earnedPoints = 0;

            if (status !== 'cancelled' && status !== 'rejected') {
                earnedPoints = loyaltySetting ? totalItems * loyaltySetting.pointsPerItem : 0;
            }

            return {
                id: order.id,
                orderNumber: order.orderNumber,
                orderType: order.orderType,
                // Add missing fields required by Frontend Order.fromJson
                subtotal: Number(order.subtotal),
                tax: Number(order.tax),
                discount: Number(order.discount),
                pointsDiscount: Number(order.pointsDiscount),
                earnedPoints: earnedPoints,
                total: Number(order.total),
                paymentStatus: order.paymentStatus,
                orderStatus: order.orderStatus,
                items: order.items.map((item) => ({
                    id: item.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: Number(item.unitPrice),
                    notes: item.notes,
                    product: {
                        name: item.product.name,
                        imageUrl: item.product.imageUrl, // Frontend might need image
                    },
                    // Flatten names for easier parsing if needed, but keeping structure standard
                })),
                outlet: {
                    ...order.outlet,
                    latitude: order.outlet.latitude ? Number(order.outlet.latitude) : null,
                    longitude: order.outlet.longitude ? Number(order.outlet.longitude) : null,
                },
                createdAt: order.createdAt.toISOString(),
            };
        });

        return paginatedResponse(formattedOrders, total, limit, offset);
    } catch (error) {
        console.error('GET /api/orders error:', error);
        return serverErrorResponse('Failed to fetch orders');
    }
});
