import { z } from 'zod';

/**
 * Validation schema for creating a new order
 * RELAXED MODE: Accepts flexible data types to unblock frontend development.
 */
export const createOrderSchema = z.object({
    outletId: z.string(),
    orderType: z.string(), // Accept any string (dine_in, pickup, delivery)

    // Items: Accept any array structure, backend logic will validate details
    items: z.array(z.any()),

    // Optional fields: Accept null/undefined/string freely
    tableId: z.any().optional(),
    scheduledTime: z.any().optional(),
    deliveryAddress: z.any().optional(),
    paymentMethod: z.string(),
    pointsToRedeem: z.number().optional(),
    voucherCode: z.any().optional(),
});

/**
 * Validation schema for updating user profile
 */
export const updateProfileSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name must be 100 characters or less'),
    email: z.string().email('Invalid email format').optional(),
});

/**
 * Validation schema for product query parameters
 */
export const productQuerySchema = z.object({
    category: z.string().optional(),
    search: z.string().max(100, 'Search query must be 100 characters or less').optional(),
    recommended: z.enum(['true', 'false']).optional(),
    available: z.enum(['true', 'false']).optional(),
    outletId: z.string().optional(),
});

/**
 * Validation schema for order query parameters
 */
export const orderQuerySchema = z.object({
    status: z.string().optional(), // Allow comma separated status list
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
    offset: z.string().regex(/^\d+$/, 'Offset must be a number').optional(),
});

/**
 * Validation schema for voucher query parameters
 */
export const voucherQuerySchema = z.object({
    filter: z.enum(['available', 'all']).optional(),
});
