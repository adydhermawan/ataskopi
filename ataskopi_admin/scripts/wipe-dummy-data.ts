import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('🧹 Starting database wipe of dummy financial transactions...')

    // Delete financial transactions
    const wipedRevenues = await prisma.dailyRealRevenue.deleteMany()
    const wipedExpenses = await prisma.expense.deleteMany()
    const wipedPurchases = await prisma.inventoryPurchase.deleteMany()
    const wipedAssets = await prisma.asset.deleteMany()
    const wipedStockOpnameItems = await prisma.stockOpnameItem.deleteMany()
    const wipedStockOpnames = await prisma.stockOpname.deleteMany()

    console.log(`✨ Deleted ${wipedRevenues.count} Daily Real Revenues`)
    console.log(`✨ Deleted ${wipedExpenses.count} Expenses`)
    console.log(`✨ Deleted ${wipedPurchases.count} Inventory Purchases`)
    console.log(`✨ Deleted ${wipedAssets.count} Assets`)
    console.log(`✨ Deleted ${wipedStockOpnames.count} Stock Opnames`)
    console.log(`✨ Deleted ${wipedStockOpnameItems.count} Stock Opname Items`)

    console.log('🎉 Data wiping completed successfully!')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
