
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start updating user points...')

    // Give everyone 5250 points (Gold tier)
    const result = await prisma.user.updateMany({
        data: {
            loyaltyPoints: 5250,
            totalSpent: 5250000
        }
    })

    console.log(`Updated ${result.count} users to 5250 points (Gold Tier!).`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
