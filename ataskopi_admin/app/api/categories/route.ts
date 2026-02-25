import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response-helpers';

const prisma = new PrismaClient();

/**
 * Handles the GET request for listing categories.
 * 
 * Fetches all categories for the current tenant, including the product count for each category.
 * Categories are ordered by the sortOrder field.
 * Requires tenant context (extracted from subdomain or header).
 * 
 * @param req - The incoming Next.js request.
 * @returns A JSON response containing a list of categories or an error message.
 */
export async function GET(req: NextRequest) {
    try {
        // Single Tenant: No tenant extraction needed

        // Fetch categories with product count
        const categories = await prisma.category.findMany({
            where: {
                // tenantId: tenant.id, // Removed for Single Tenant
            },
            include: {
                _count: {
                    select: {
                        products: {
                            where: {
                                isAvailable: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                sortOrder: 'asc',
            },
        });

        // Format response
        const formattedCategories = categories.map((category) => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
            sortOrder: category.sortOrder,
            productCount: category._count.products,
        }));

        return successResponse(formattedCategories);
    } catch (error) {
        console.error('GET /api/categories error:', error);
        return serverErrorResponse('Failed to fetch categories');
    }
}
