import { z } from 'zod';

export const dashboardQuerySchema = z.object({
    outletId: z.string().uuid().optional().nullable(),
    days: z.coerce.number().min(1).max(90).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
}).refine(data => data.days || (data.startDate && data.endDate), {
    message: "Either 'days' or both 'startDate' and 'endDate' are required"
});
