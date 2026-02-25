
import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const qrCode = searchParams.get('qrCode');
        const outletId = searchParams.get('outletId');

        // In the single-tenant refactor, we are mostly defaulting to the demo tenant 
        // or the user's tenant. For this public/semi-public endpoint, we'll assume 
        // we search across the active tenant (demo) or lookup globally if QR is unique.

        // Ideally, we get tenant from header 'x-tenant-id'
        const tenantSlug = request.headers.get('x-tenant-id') || 'demo';

        if (qrCode) {
            // Find table by QR Code (partial match to handle full URL vs code) OR Table Number
            const table = await prisma.table.findFirst({
                where: {
                    // outlet: {
                    //    tenant: { tenantSlug: tenantSlug }
                    // },
                    OR: [
                        { qrCode: { contains: qrCode } }, // Handles partial code match
                        { tableNumber: qrCode }          // Handles manual table number entry "03"
                    ]
                },
                include: {
                    outlet: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (!table) {
                return NextResponse.json({ success: false, message: 'Table not found' }, { status: 404 });
            }

            return NextResponse.json({ success: true, data: table });
        }

        if (outletId) {
            const tables = await prisma.table.findMany({
                where: {
                    outlet: {
                        id: outletId
                    }
                },
                orderBy: { tableNumber: 'asc' }
            });
            return NextResponse.json({ success: true, data: tables });
        }

        return NextResponse.json({ success: false, message: 'Please provide qrCode or outletId' }, { status: 400 });

    } catch (error) {
        console.error('Error fetching tables:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
