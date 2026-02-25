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

// Schema for updating an address
const updateAddressSchema = z.object({
    label: z.string().min(1).optional(),
    address: z.string().min(5).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    notes: z.string().optional(),
    isDefault: z.boolean().optional(),
});

export const dynamic = 'force-dynamic';

/**
 * PUT: Update an existing address
 */
export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const user = req.user!;
        const { id } = await params;
        const addressId = id;
        const body = await req.json();

        // Validate Body
        const validation = updateAddressSchema.safeParse(body);
        if (!validation.success) {
            return errorResponse((validation.error as any).errors[0].message, 400);
        }

        const data = validation.data;

        // Verify ownership
        const existingAddress = await prisma.userAddress.findUnique({
            where: { id: addressId },
        });

        if (!existingAddress || existingAddress.userId !== user.id) {
            return errorResponse('Address not found', 404);
        }

        // Handle Default Toggle
        if (data.isDefault) {
            await prisma.userAddress.updateMany({
                where: { userId: user.id, isDefault: true, id: { not: addressId } },
                data: { isDefault: false },
            });
        }

        const updatedAddress = await prisma.userAddress.update({
            where: { id: addressId },
            data: {
                label: data.label,
                address: data.address,
                latitude: data.latitude,
                longitude: data.longitude,
                notes: data.notes,
                isDefault: data.isDefault,
            },
        });

        return successResponse({
            id: updatedAddress.id,
            label: updatedAddress.label,
            address: updatedAddress.address,
            latitude: Number(updatedAddress.latitude),
            longitude: Number(updatedAddress.longitude),
            notes: updatedAddress.notes,
            isDefault: updatedAddress.isDefault,
        });

    } catch (error) {
        console.error('PUT /api/me/addresses/[id] error:', error);
        return serverErrorResponse('Failed to update address');
    }
});

/**
 * DELETE: Remove an address
 */
export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const user = req.user!;
        const { id } = await params;
        const addressId = id;

        // Verify ownership
        const existingAddress = await prisma.userAddress.findUnique({
            where: { id: addressId },
        });

        if (!existingAddress || existingAddress.userId !== user.id) {
            return errorResponse('Address not found', 404);
        }

        await prisma.userAddress.delete({
            where: { id: addressId },
        });

        return successResponse({ message: 'Address deleted successfully' });

    } catch (error) {
        console.error('DELETE /api/me/addresses/[id] error:', error);
        return serverErrorResponse('Failed to delete address');
    }
});
