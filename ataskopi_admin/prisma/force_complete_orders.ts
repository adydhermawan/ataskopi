
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Force completing all active orders...');

    // Find all active orders
    const orders = await prisma.order.findMany({
        where: {
            orderStatus: { in: ['pending', 'preparing', 'ready'] },
        },
        include: {
            user: true
        }
    });

    console.log(`Found ${orders.length} active orders.`);

    for (const order of orders) {
        console.log(`Processing Order ${order.orderNumber} (User: ${order.user.name}, Points Used: ${order.pointsUsed})...`);

        // Update status
        await prisma.order.update({
            where: { id: order.id },
            data: {
                orderStatus: 'completed',
                paymentStatus: 'paid', // Ensure paid
            },
        });

        console.log(`  -> Mark as Completed.`);

        // Check verification: Points deduction audit
        if (order.pointsUsed > 0) {
            const tx = await prisma.loyaltyTransaction.findFirst({
                where: {
                    orderId: order.id,
                    transactionType: 'redeemed' // updated from redeem to redeemed based on schema/route
                }
            });

            if (!tx) {
                console.warn(`  WARNING: Order ${order.orderNumber} used ${order.pointsUsed} points but NO Loyalty Transaction found!`);
                // Fix it? 
                // Deduct points manually?
                // Assuming route.ts logic holds, this shouldn't happen unless manual DB insert.
            } else {
                console.log(`  -> Verified Loyalty Transaction: -${order.pointsUsed} points.`);
            }
        }

        // Award Points (Earning) - If not already awarded
        // Logic: 1 point per item (default) or config
        // Check if earn transaction exists
        const earnTx = await prisma.loyaltyTransaction.findFirst({
            where: {
                orderId: order.id,
                transactionType: 'earned'
            }
        });

        if (!earnTx) {
            // Calculate points to earn
            const settings = await prisma.loyaltySetting.findFirst();
            const pointsPerItem = settings?.pointsPerItem || 1;

            // Count items
            // Need to fetch items if counting items
            const fullOrder = await prisma.order.findUnique({
                where: { id: order.id },
                include: { items: true }
            });

            const totalItems = fullOrder?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
            const pointsEarned = totalItems * pointsPerItem;

            if (pointsEarned > 0) {
                console.log(`  -> Awarding ${pointsEarned} points (Earn)...`);
                await prisma.$transaction([
                    prisma.user.update({
                        where: { id: order.userId },
                        data: { loyaltyPoints: { increment: pointsEarned } }
                    }),
                    prisma.loyaltyTransaction.create({
                        data: {
                            userId: order.userId,
                            orderId: order.id,
                            transactionType: 'earned',
                            pointsChange: pointsEarned,
                            pointsBalanceAfter: order.user.loyaltyPoints + pointsEarned, // Approximation
                            notes: `Earned from Order ${order.orderNumber}`
                        }
                    })
                ]);
            }
        }

    }

    console.log('Done.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
