
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for completed orders...');

    // Find all completed orders
    const orders = await prisma.order.findMany({
        where: {
            orderStatus: 'completed',
        },
        include: {
            user: true
        }
    });

    console.log(`Found ${orders.length} completed orders.`);

    if (orders.length > 0) {
        console.log('Sample Order:', orders[0].orderNumber, 'User:', orders[0].user.name, 'ID:', orders[0].user.id);
    } else {
        console.log('No completed orders found.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
