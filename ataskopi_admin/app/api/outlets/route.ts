import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withOptionalAuth } from '@/lib/middleware/auth-middleware';
import {
    successResponse,
    serverErrorResponse,
} from '@/lib/api/response-helpers';

const prisma = new PrismaClient();

/**
 * Handles the GET request for listing active outlets.
 * 
 * If user coordinates are provided, calculates the distance to each outlet 
 * using the Haversine formula and sorts by proximity.
 * 
 * @param req - The incoming request.
 * @returns A JSON response with a list of outlets.
 */
export const GET = withOptionalAuth(async (req: NextRequest) => {
    try {
        // Single Tenant: No tenant extraction needed

        const { searchParams } = new URL(req.url);
        const latitude = searchParams.get('latitude');
        const longitude = searchParams.get('longitude');

        // Fetch active outlets
        const outlets = await prisma.outlet.findMany({
            where: {
                // tenantId, // Removed for Single Tenant
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                latitude: true,
                longitude: true,
                operatingHours: true,
                isActive: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        // Calculate distance if user location provided
        let outletsWithDistance = outlets.map((outlet) => {
            let distance = null;

            if (latitude && longitude && outlet.latitude && outlet.longitude) {
                const userLat = parseFloat(latitude);
                const userLon = parseFloat(longitude);
                const outletLat = Number(outlet.latitude);
                const outletLon = Number(outlet.longitude);

                // Haversine formula for distance calculation
                const R = 6371; // Earth's radius in km
                const dLat = (outletLat - userLat) * (Math.PI / 180);
                const dLon = (outletLon - userLon) * (Math.PI / 180);
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(userLat * (Math.PI / 180)) *
                    Math.cos(outletLat * (Math.PI / 180)) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                distance = R * c; // Distance in km
            }

            return {
                id: outlet.id,
                name: outlet.name,
                address: outlet.address,
                phone: outlet.phone,
                latitude: outlet.latitude ? Number(outlet.latitude) : null,
                longitude: outlet.longitude ? Number(outlet.longitude) : null,
                operatingHours: outlet.operatingHours,
                distance: distance !== null ? parseFloat(distance.toFixed(2)) : null,
            };
        });

        // Sort by distance if available
        if (latitude && longitude) {
            outletsWithDistance.sort((a, b) => {
                if (a.distance === null) return 1;
                if (b.distance === null) return -1;
                return a.distance - b.distance;
            });
        }

        return successResponse(outletsWithDistance);
    } catch (error) {
        console.error('GET /api/outlets error:', error);
        return serverErrorResponse('Failed to fetch outlets');
    }
});
