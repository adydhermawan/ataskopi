import { db as prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        // Add a simple secret to prevent accidental triggering
        if (url.searchParams.get('secret') !== 'ataskopi123') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("Starting initial stock migration via API...");

        // Get all raw materials
        const materials = await prisma.rawMaterial.findMany({
            include: {
                purchases: true,
                stockOpnameItems: {
                    where: { stockOpname: { status: 'COMPLETED' } },
                    include: { stockOpname: true }
                }
            }
        });

        let fixedCount = 0;
        const messages: string[] = [];

        for (const mat of materials) {
            if (mat.purchases.length === 0) {
                const currentStock = Number(mat.currentStock);
                const avgCost = Number(mat.averageCost);
                
                let totalCogsStock = 0;
                for (const opItem of mat.stockOpnameItems) {
                   const diff = Number(opItem.systemStock) - Number(opItem.actualStock);
                   if (diff > 0) totalCogsStock += diff;
                }
                
                const assumedInitialStock = currentStock + totalCogsStock;
                
                if (assumedInitialStock > 0 && avgCost > 0) {
                    await prisma.inventoryPurchase.create({
                        data: {
                            outletId: mat.outletId,
                            rawMaterialId: mat.id,
                            date: mat.createdAt,
                            quantity: new Prisma.Decimal(assumedInitialStock),
                            unitPrice: new Prisma.Decimal(avgCost),
                            totalAmount: new Prisma.Decimal(assumedInitialStock * avgCost),
                            supplier: "Initial Stock (Migrated)",
                            notes: "Stok awal hasil migrasi data lama",
                            paymentMethod: "CASH",
                            paymentStatus: "PAID",
                            paidAt: mat.createdAt,
                            deliveryStatus: "RECEIVED",
                            receivedAt: mat.createdAt,
                        }
                    });
                    fixedCount++;
                    messages.push(`Created initial purchase for ${mat.name}: Qty ${assumedInitialStock}`);
                }
            } else {
                const totalPurchasedQty = mat.purchases.reduce((acc: number, p: any) => acc + Number(p.quantity), 0);
                const currentStock = Number(mat.currentStock);
                const avgCost = Number(mat.averageCost);
                
                let totalCogsStock = 0;
                for (const opItem of mat.stockOpnameItems) {
                   const diff = Number(opItem.systemStock) - Number(opItem.actualStock);
                   if (diff > 0) totalCogsStock += diff;
                }
                
                const accountedStock = currentStock + totalCogsStock;
                const missingStock = accountedStock - totalPurchasedQty;
                
                if (missingStock > 0.01 && avgCost > 0) {
                   await prisma.inventoryPurchase.create({
                       data: {
                           outletId: mat.outletId,
                           rawMaterialId: mat.id,
                           date: mat.createdAt, 
                           quantity: new Prisma.Decimal(missingStock),
                           unitPrice: new Prisma.Decimal(avgCost),
                           totalAmount: new Prisma.Decimal(missingStock * avgCost),
                           supplier: "Initial Stock (Migrated)",
                           notes: "Stok awal hasil migrasi data lama",
                           paymentMethod: "CASH",
                           paymentStatus: "PAID",
                           paidAt: mat.createdAt,
                           deliveryStatus: "RECEIVED",
                           receivedAt: mat.createdAt,
                       }
                   });
                   fixedCount++;
                   messages.push(`Created missing purchase for ${mat.name}: Qty ${missingStock}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            fixedCount,
            messages,
        });

    } catch (error: any) {
        console.error("Migration error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
