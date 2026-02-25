import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withOptionalAuth } from '@/lib/middleware/auth-middleware';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response-helpers';
import { productQuerySchema } from '@/lib/validation/order-schemas';

const prisma = new PrismaClient();

/**
 * Handles the GET request for listing products.
 * 
 * Provides features like category filtering, search by name, and filtering by recommendation 
 * or availability. It also includes associated options and modifiers for each product.
 * Requires tenant context (extracted from subdomain or header).
 * 
 * @param req - The incoming Next.js request.
 * @returns A JSON response containing a list of products or an error message.
 */
export const GET = withOptionalAuth(async (req: NextRequest) => {
    try {
        // Single Tenant Mode: Skip tenant check

        // Parse and validate query parameters
        const { searchParams } = new URL(req.url);
        const queryParams = {
            category: searchParams.get('category') || undefined,
            search: searchParams.get('search') || undefined,
            recommended: searchParams.get('recommended') || undefined,
            available: searchParams.get('available') || 'true',
            outletId: searchParams.get('outletId') || undefined,
        };

        const validation = productQuerySchema.safeParse(queryParams);
        // Note: productQuerySchema might fail if I add unknown field.
        // I should check `lib/validation/order-schemas.ts` or just extract `outletId` separately.
        const outletId = searchParams.get('outletId');
        if (!validation.success) {
            return errorResponse('Invalid query parameters', 400);
        }

        // Build where clause (Global, no tenant filter)
        const where: any = {};

        // Filter by category
        if (queryParams.category) {
            const category = await prisma.category.findFirst({
                where: {
                    // tenantId: tenant.id, // Removed tenant filter
                    slug: queryParams.category,
                },
            });
            if (category) {
                where.categoryId = category.id;
            }
        }

        // Search by product name
        if (queryParams.search) {
            where.name = {
                contains: queryParams.search,
                mode: 'insensitive',
            };
        }

        // Filter by recommended
        if (queryParams.recommended === 'true') {
            where.isRecommended = true;
        }

        // Filter by availability
        if (queryParams.available === 'true') {
            where.isAvailable = true;
        }

        // Fetch products with relations
        const products = await prisma.product.findMany({
            where,
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
                ...(outletId ? {
                    outletProducts: {
                        where: { outletId }
                    }
                } : {}),
            },
            orderBy: [
                { isRecommended: 'desc' },
                { name: 'asc' },
            ],
        });

        if (outletId) {
            console.log(`[GET /api/products] Fetching for outletId: ${outletId}`);
        } else {
            console.log(`[GET /api/products] Fetching global products`);
        }

        console.log(`[GET /api/products] Found ${products.length} products from DB`);

        // Format response
        let formattedProducts = products.map((product) => {
            // Calculate effective availability
            // 1. Global availability (product.isAvailable)
            // 2. Outlet availability (if outletId provided)
            let isAvailable = product.isAvailable;

            if (outletId && (product as any).outletProducts?.length > 0) {
                // If record exists, use its status
                // explicit false overrides true
                if (!(product as any).outletProducts[0].isAvailable) {
                    isAvailable = false;
                }
            }

            // Debug log for first product to check logic structure
            if (product === products[0]) {
                console.log(`[Debug Product 0] Name: ${product.name}, Global: ${product.isAvailable}, OutletId: ${outletId}, HasOutletProduct: ${(product as any).outletProducts?.length}, OutletAvailable: ${(product as any).outletProducts?.[0]?.isAvailable}, Effective: ${isAvailable}`);
            }

            return {
                id: product.id,
                name: product.name,
                description: product.description,
                basePrice: Number(product.basePrice),
                imageUrl: product.imageUrl,
                isAvailable: isAvailable,
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
            };
        });

        // Filter based on effective availability if requested
        if (queryParams.available === 'true') {
            formattedProducts = formattedProducts.filter(p => p.isAvailable);
        }

        console.log(`[GET /api/products] Returning ${formattedProducts.length} products after filter`);

        return successResponse(formattedProducts);
    } catch (error) {
        console.error('GET /api/products error details:', error); // Detail Log
        return serverErrorResponse('Failed to fetch products');
    }
});
