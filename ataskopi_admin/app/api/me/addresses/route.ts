import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth-middleware';
import {
    successResponse,
    errorResponse,
    serverErrorResponse,
} from '@/lib/api/response-helpers';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema for creating an address
const createAddressSchema = z.object({
    label: z.string().min(1, "Label is required (e.g., Home, Office)"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    notes: z.string().optional(),
    isDefault: z.boolean().default(false),
});

/**
 * GET: List all addresses for the authenticated user
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user!;

        const addresses = await prisma.userAddress.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });

        // Format decimal fields to numbers
        const formattedAddresses = addresses.map(addr => ({
            id: addr.id,
            label: addr.label,
            address: addr.address,
            latitude: Number(addr.latitude),
            longitude: Number(addr.longitude),
            notes: addr.notes,
            isDefault: addr.isDefault,
        }));

        return successResponse(formattedAddresses);
    } catch (error) {
        console.error('GET /api/me/addresses error:', error);
        return serverErrorResponse('Failed to fetch addresses');
    }
});

/**
 * POST: Create a new address for the authenticated user
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user!;
        const body = await req.json();

        // Validate
        const validation = createAddressSchema.safeParse(body);
        if (!validation.success) {
            return errorResponse((validation.error as any).errors[0].message, 400);
        }

        const data = validation.data;

        // If isDefault is true, unset other defaults
        if (data.isDefault) {
            await prisma.userAddress.updateMany({
                where: { userId: user.id, isDefault: true },
                data: { isDefault: false },
            });
        }

        const newAddress = await prisma.userAddress.create({
            data: {
                userId: user.id,
                label: data.label,
                address: data.address,
                latitude: data.latitude,
                longitude: data.longitude,
                notes: data.notes,
                isDefault: data.isDefault,
            },
        });

        return successResponse({
            id: newAddress.id,
            label: newAddress.label,
            address: newAddress.address,
            latitude: Number(newAddress.latitude),
            longitude: Number(newAddress.longitude),
            notes: newAddress.notes,
            isDefault: newAddress.isDefault,
        }, 201);

    } catch (error) {
        console.error('POST /api/me/addresses error:', error);
        return serverErrorResponse('Failed to create address');
    }
});
