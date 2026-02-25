
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const statuses = [
    'pending',
    'preparing',
    'ready',
    'waiting_pickup',
    'on_the_way',
    'completed',
    'cancelled'
]

async function main() {
    console.log('Start updating orders...')

    const orders = await prisma.order.findMany()
    console.log(`Found ${orders.length} orders.`)

    for (const order of orders) {
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]

        // logic to make it realistic: if it was created long ago, make it completed
        // but for now random is fine as per user request to see function

        await prisma.order.update({
            where: { id: order.id },
            data: { orderStatus: randomStatus }
        })
        console.log(`Updated Order ${order.id} to ${randomStatus}`)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
