const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting initial stock migration...");

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

  console.log(`Found ${materials.length} raw materials.`);

  for (const mat of materials) {
    // We want to detect materials that were created with an initial stock
    // but have NO purchases at all, or their first purchase doesn't cover their initial existence.
    // The safest heuristic is: If a material has NO purchases, but has stock or had COGS, it means its initial stock wasn't recorded.
    
    // Actually, let's look at the first stock opname or current stock.
    // If there are no purchases at all, but current stock > 0, we can just create an initial stock purchase based on its averageCost.
    
    // Wait, what if it has currentStock > 0 but NO purchases?
    if (mat.purchases.length === 0) {
      const currentStock = Number(mat.currentStock);
      const avgCost = Number(mat.averageCost);
      
      // We also need to check if it was EVER used (COGS > 0)
      let totalCogsStock = 0;
      for (const opItem of mat.stockOpnameItems) {
         const diff = Number(opItem.systemStock) - Number(opItem.actualStock);
         if (diff > 0) totalCogsStock += diff;
      }
      
      const assumedInitialStock = currentStock + totalCogsStock;
      
      if (assumedInitialStock > 0 && avgCost > 0) {
        console.log(`Fixing ${mat.name}: assumed initial stock = ${assumedInitialStock}, avgCost = ${avgCost}`);
        
        await prisma.inventoryPurchase.create({
            data: {
                outletId: mat.outletId,
                rawMaterialId: mat.id,
                date: mat.createdAt, // use creation date of material as purchase date
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
        console.log(`Created purchase for ${mat.name}`);
      }
    } else {
        // If there ARE purchases, it might still have an unrecorded initial stock.
        // Let's sum up all purchases.
        const totalPurchasedQty = mat.purchases.reduce((acc: number, p: any) => acc + Number(p.quantity), 0);
        
        const currentStock = Number(mat.currentStock);
        const avgCost = Number(mat.averageCost);
        
        let totalCogsStock = 0;
        for (const opItem of mat.stockOpnameItems) {
           const diff = Number(opItem.systemStock) - Number(opItem.actualStock);
           if (diff > 0) totalCogsStock += diff;
        }
        
        const accountedStock = currentStock + totalCogsStock;
        
        // If the accounted stock is greater than total purchased by a significant margin
        // it means there was an initial stock that was never recorded as a purchase.
        // We allow a small float precision margin
        const missingStock = accountedStock - totalPurchasedQty;
        
        if (missingStock > 0.01 && avgCost > 0) {
           console.log(`Fixing ${mat.name}: accountedStock = ${accountedStock}, purchased = ${totalPurchasedQty}, missing = ${missingStock}`);
           
           // Create a purchase for the missing stock
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
           console.log(`Created missing purchase for ${mat.name} (${missingStock})`);
        }
    }
  }
  
  console.log("Migration complete.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
