import { z } from 'zod';

export const saveRealRevenueSchema = z.object({
    id: z.string().uuid().optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" }),
    outletId: z.string().uuid({ message: "Invalid outlet ID" }),
    amount: z.coerce.number().min(0, { message: "Amount must be a non-negative number" }),
    notes: z.string().max(500, { message: "Notes must be under 500 characters" }).optional().nullable(),
});

export const getRealRevenueQuerySchema = z.object({
    outletId: z.string().uuid().optional().nullable(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});
