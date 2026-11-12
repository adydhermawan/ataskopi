import { Decimal } from '@prisma/client/runtime/library';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * Adds received stock to a raw material and moves its average cost:
 * (oldStock * oldAvgCost + totalAmount) / (oldStock + quantity).
 */
export async function addStockToMaterial(tx: Tx, rawMaterialId: string, quantity: number, totalAmount: number) {
    const material = await tx.rawMaterial.findUnique({
        where: { id: rawMaterialId },
    });
    if (!material) throw new Error('Bahan baku tidak ditemukan');

    const oldStock = Number(material.currentStock);
    const oldAvgCost = Number(material.averageCost);
    const newStock = oldStock + quantity;
    const newAvgCost = newStock > 0 ? (oldStock * oldAvgCost + totalAmount) / newStock : 0;

    await tx.rawMaterial.update({
        where: { id: rawMaterialId },
        data: {
            currentStock: new Decimal(newStock.toFixed(2)),
            averageCost: new Decimal(newAvgCost.toFixed(2)),
        },
    });

    return { materialName: material.name, unit: material.unit, newAvgCost };
}

/** Reverses [addStockToMaterial] when a received purchase is deleted. */
export async function removeStockFromMaterial(tx: Tx, rawMaterialId: string, quantity: number, totalAmount: number) {
    const material = await tx.rawMaterial.findUnique({
        where: { id: rawMaterialId },
    });
    if (!material) return;

    const oldStock = Number(material.currentStock);
    const oldAvgCost = Number(material.averageCost);
    const newStock = Math.max(0, oldStock - quantity);

    let newAvgCost = oldAvgCost;
    if (newStock > 0) {
        const calculated = (oldStock * oldAvgCost - totalAmount) / newStock;
        if (calculated > 0) newAvgCost = calculated;
    }

    await tx.rawMaterial.update({
        where: { id: rawMaterialId },
        data: {
            currentStock: new Decimal(newStock.toFixed(2)),
            averageCost: new Decimal(newAvgCost.toFixed(2)),
        },
    });
}
