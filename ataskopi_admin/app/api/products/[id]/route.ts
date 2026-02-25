import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response-helpers';


const prisma = new PrismaClient();

/**
 * GET /api/products/[id]
 * Get detailed product information by ID
 * Public endpoint (no auth required) but tenant-aware
 */
/**
 * Handles the GET request for a specific product detail.
 *
 * Fetches detailed information for a single product, including its category,
 * all available options with their values, and all available modifiers.
 *
 * @param req - The incoming Next.js request.
 * @param context - Contains the dynamic route parameters (e.g., product ID).
 * @param tenantId - The validated ID of the current tenant.
 * @returns A JSON response containing the product detail or a 404/error message.
 */
export const GET = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id } = await params;

        // Fetch product with all details
        const product = await prisma.product.findFirst({
            where: {
                id,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                options: {
                    include: {
                        values: {
                            orderBy: { sortOrder: 'asc' },
                        },
                    },
                    orderBy: { sortOrder: 'asc' },
                },
                modifiers: {
                    where: { isAvailable: true },
                    orderBy: { sortOrder: 'asc' },
                },
            },
        });

        if (!product) {
            return notFoundResponse('Product');
        }

        // Format response
        const formattedProduct = {
            id: product.id,
            name: product.name,
            description: product.description,
            basePrice: Number(product.basePrice),
            imageUrl: product.imageUrl,
            isAvailable: product.isAvailable,
            isRecommended: product.isRecommended,
            category: product.category,
            options: product.options.map((option) => ({
                id: option.id,
                name: option.name,
                minSelect: option.minSelect,
                maxSelect: option.maxSelect,
                values: option.values.map((value) => ({
                    id: value.id,
                    name: value.name,
                    priceModifier: Number(value.priceModifier),
                    isDefault: value.isDefault,
                })),
            })),
            modifiers: product.modifiers.map((modifier) => ({
                id: modifier.id,
                name: modifier.name,
                price: Number(modifier.price),
                isAvailable: modifier.isAvailable,
            })),
            createdAt: product.createdAt.toISOString(),
            updatedAt: product.updatedAt.toISOString(),
        };

        return successResponse(formattedProduct);
    } catch (error) {
        console.error('GET /api/products/[id] error:', error);
        return serverErrorResponse('Failed to fetch product');
    }
};
