import { z } from 'zod';

const clientId = z.string().min(8).max(64);
const money = z.number().nonnegative();
const reason = z.string().trim().min(1).max(200);

export const posPaymentSchema = z.object({
    clientPaymentId: clientId,
    method: z.enum(['cash', 'qris', 'shopeefood', 'grab']),
    amount: z.number().positive(),
    tenderedAmount: money.optional(),
    paidAt: z.iso.datetime().optional(),
    shiftId: z.string().optional(),
});

const posOrderItemSchema = z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPrice: money,
    notes: z.string().max(200).nullish(),
    selectedOptions: z.array(z.object({ optionId: z.string(), valueId: z.string() })).default([]),
    selectedModifiers: z
        .array(z.object({ modifierId: z.string(), quantity: z.number().int().positive() }))
        .default([]),
});

export const posOrderSchema = z.object({
    clientOrderId: clientId,
    revision: z.number().int().nonnegative().default(0),
    orderType: z.enum(['dine_in', 'pickup', 'delivery']),
    channel: z.enum(['walk_in', 'shopeefood', 'grab']).default('walk_in'),
    queueNumber: z.string().min(1).max(16),
    guestName: z.string().max(100).nullish(),
    customerId: z.string().nullish(),
    tableId: z.string().nullish(),
    shiftId: z.string().min(1),
    notes: z.string().max(300).nullish(),
    createdAt: z.iso.datetime(),
    items: z.array(posOrderItemSchema).min(1),
    subtotal: money,
    discount: money.default(0),
    tax: money.default(0),
    total: money,
    payments: z.array(posPaymentSchema).default([]),
});

export const posSyncSchema = z.object({
    outletId: z.string().min(1),
    orders: z.array(posOrderSchema).min(1).max(50),
});

export const posStatusSchema = z.object({
    status: z.enum([
        'preparing',
        'ready',
        'waiting_pickup',
        'on_delivery',
        'completed',
        'cancelled',
        'rejected',
    ]),
    expectedStatus: z.string().min(1),
});

export const posVoidSchema = z.object({ reason });

export const posRefundSchema = z.object({
    clientRefundId: clientId,
    method: z.enum(['cash', 'qris']),
    amount: z.number().positive(),
    reason,
    shiftId: z.string().optional(),
});

export const posOpenShiftSchema = z.object({
    outletId: z.string().min(1),
    clientShiftId: clientId,
    openingCash: money,
    openedAt: z.iso.datetime().optional(),
});

export const posDailyCashSchema = z.object({
    cashAmount: money,
    qrisAmount: money,
    otherAmount: money.optional(),
    otherMethodName: z.string().trim().max(100).nullish(),
    notes: z.string().max(500).nullish(),
});

export const posShiftPurchaseSchema = z.object({
    rawMaterialId: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: money.optional(),
    totalAmount: z.number().positive(),
    supplier: z.string().trim().max(100).nullish(),
    notes: z.string().trim().max(300).nullish(),
});

export const expenseCategories = ['OPERATIONAL', 'SALARY', 'UTILITY', 'RENT', 'OTHER'] as const;

export const posShiftExpenseSchema = z.object({
    category: z.enum(expenseCategories),
    amount: z.number().positive(),
    description: z.string().trim().max(300).nullish(),
});

export const posCloseShiftSchema = z.object({
    actualCash: money,
    closedAt: z.iso.datetime().optional(),
    notes: z.string().max(300).nullish(),
    dailyCash: posDailyCashSchema.optional(),
});

export const posCashMovementSchema = z.object({
    clientMovementId: clientId,
    type: z.enum(['in', 'out']),
    amount: z.number().positive(),
    reason,
});

export const posAvailabilitySchema = z.object({
    outletId: z.string().min(1),
    isAvailable: z.boolean(),
});

export const posOnlineOrdersSchema = z.object({
    outletId: z.string().min(1),
    paused: z.boolean(),
});

export type PosOrderInput = z.infer<typeof posOrderSchema>;
export type PosPaymentInput = z.infer<typeof posPaymentSchema>;
