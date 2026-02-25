import { z } from 'zod';

export const dashboardQuerySchema = z.object({
    outletId: z.string().uuid().optional().nullable(),
    days: z.coerce.number().min(1).max(90).default(7),
});
