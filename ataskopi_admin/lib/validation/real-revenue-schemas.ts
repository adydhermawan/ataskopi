import { z } from 'zod';

export const saveRealRevenueSchema = z.object({
    id: z.string().uuid().optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" }),
    outletId: z.string().uuid({ message: "Invalid outlet ID" }),
    cashAmount: z.coerce.number().min(0, { message: "Cash amount must be non-negative" }),
    qrisAmount: z.coerce.number().min(0, { message: "QRIS amount must be non-negative" }),
    otherAmount: z.coerce.number().min(0, { message: "Other amount must be non-negative" }).optional().default(0),
    otherMethodName: z.string().max(100, { message: "Method name must be under 100 characters" }).optional().nullable(),
    notes: z.string().max(500, { message: "Notes must be under 500 characters" }).optional().nullable(),
});

export const getRealRevenueQuerySchema = z.object({
    outletId: z.string().uuid().optional().nullable(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});
