import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    // 1. Clean up existing data
    console.log('🧹 Cleaning up old data...')
    await prisma.orderItemOption.deleteMany()
    await prisma.orderItemModifier.deleteMany()
    await prisma.orderItem.deleteMany()
    await prisma.loyaltyTransaction.deleteMany()
    await prisma.order.deleteMany()
    await prisma.productModifier.deleteMany()
    await prisma.productOptionValue.deleteMany()
    await prisma.productOption.deleteMany()
    await prisma.product.deleteMany()
    await prisma.category.deleteMany()
    await prisma.userVoucher.deleteMany()
    await prisma.voucher.deleteMany()
    await prisma.table.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.userAddress.deleteMany()
    await prisma.user.deleteMany()
    await prisma.membershipTier.deleteMany()
    await prisma.loyaltySetting.deleteMany()
    await prisma.orderModeSetting.deleteMany()
    await prisma.promo.deleteMany()
    await prisma.dailyRealRevenue.deleteMany()
    await prisma.inventoryPurchase.deleteMany()
    await prisma.stockOpnameItem.deleteMany()
    await prisma.stockOpname.deleteMany()
    await prisma.rawMaterial.deleteMany()
    await prisma.expense.deleteMany()
    await prisma.asset.deleteMany()
    await prisma.outlet.deleteMany()
    console.log('✨ Database cleaned')

    // 2. Create Categories
    const categoriesData = [
        { name: 'Coffee', slug: 'coffee', sortOrder: 1 },
        { name: 'Non-Coffee', slug: 'non-coffee', sortOrder: 2 },
        { name: 'Food & Snacks', slug: 'food-snacks', sortOrder: 3 },
        { name: 'Pastry', slug: 'pastry', sortOrder: 4 },
    ]

    const categoryMap = new Map()

    for (const cat of categoriesData) {
        const created = await prisma.category.upsert({
            where: { slug: cat.slug },
            update: {},
            create: {
                name: cat.name,
                slug: cat.slug,
                sortOrder: cat.sortOrder
            }
        })
        categoryMap.set(cat.slug, created.id)
    }

    console.log('✅ Categories seeded')

    // 3. Create Only One Outlet: "Atas Kopi VW"
    const firstOutlet = await prisma.outlet.create({
        data: {
            name: 'Atas Kopi VW',
            address: 'Jl. Atas Kopi Raya No. 1, Semarang',
            latitude: -6.9839,
            longitude: 110.4104,
        }
    })

    console.log('✅ Outlet Atas Kopi VW seeded')

    // 4. Create Vouchers (Rewards & Promos)
    const vouchersData = [
        {
            code: 'KOPIHEMAT',
            discountType: 'fixed',
            discountValue: 10000,
            minOrder: 30000,
            desc: 'Potongan Rp 10.000, Tukar 50 Poin',
            pointCost: 50,
            isRedeemable: true
        },
        {
            code: 'USERBARU',
            discountType: 'percentage',
            discountValue: 20,
            maxDiscount: 15000,
            desc: 'Diskon 20% Pengguna Baru (Gratis Redeem)',
            pointCost: 0,
            isRedeemable: true
        },
        {
            code: 'SECRET',
            discountType: 'fixed',
            discountValue: 5000,
            minOrder: 0,
            desc: 'Secret Voucher',
            pointCost: 0,
            isRedeemable: false
        },
    ]

    for (const v of vouchersData) {
        await prisma.voucher.upsert({
            where: { code: v.code },
            update: {
                pointCost: v.pointCost,
                isRedeemable: v.isRedeemable
            },
            create: {
                code: v.code,
                description: v.desc,
                discountType: v.discountType,
                discountValue: v.discountValue,
                maxDiscount: v.maxDiscount,
                minOrder: v.minOrder,
                startDate: new Date(new Date().getTime() - 60000 * 60),
                endDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 30),
                pointCost: v.pointCost,
                isRedeemable: v.isRedeemable
            }
        })
    }

    console.log('✅ Vouchers seeded')

    // 4.5 Create Loyalty Settings (Single Record)
    await prisma.loyaltySetting.create({
        data: {
            isEnabled: true,
            pointsPerItem: 1,
            pointValueIdr: 1000,
            minPointsToRedeem: 10,
            maxPointsPerTransaction: 100,
        }
    })

    console.log('✅ Loyalty settings seeded')

    // 4.5.1 Create Order Mode Settings (Single Record)
    await prisma.orderModeSetting.create({
        data: {
            dineIn: true,
            pickup: true,
            delivery: true,
            dineInMethod: 'SCAN_ONLY',
            taxEnabled: true,
            dailyCurationsEnabled: true,
        }
    })

    console.log('✅ Order mode settings seeded')

    // 4.6 Create Membership Tiers
    const tiers = await Promise.all([
        prisma.membershipTier.create({
            data: {
                tierLevel: 1,
                tierName: 'Bronze',
                minPoints: 0,
                maxPoints: 100,
                benefitsDescription: 'Basic member benefits',
            },
        }),
        prisma.membershipTier.create({
            data: {
                tierLevel: 2,
                tierName: 'Silver',
                minPoints: 100,
                maxPoints: 500,
                benefitsDescription: 'Access to tier-specific vouchers and priority support',
            },
        }),
        prisma.membershipTier.create({
            data: {
                tierLevel: 3,
                tierName: 'Gold',
                minPoints: 500,
                maxPoints: null,
                benefitsDescription: 'Exclusive vouchers, priority support, and special events access',
            },
        }),
    ])

    console.log('✅ Membership tiers seeded')

    // 4.6.1 Create Promos/Banners
    const promosData = [
        {
            title: 'Morning Brew Special',
            description: 'Start your day with our special coffee blend.',
            bannerUrl: '/images/promos/banner1.png',
            displayOrder: 1,
        },
        {
            title: 'Weekend Pastry Deal',
            description: 'Delicious pastries at half price every weekend.',
            bannerUrl: '/images/promos/banner2.png',
            displayOrder: 2,
        },
        {
            title: 'Free Delivery',
            description: 'Get free delivery for orders above Rp 50.000.',
            bannerUrl: '/images/promos/banner3.png',
            displayOrder: 3,
        },
    ]

    for (const p of promosData) {
        await prisma.promo.create({
            data: {
                title: p.title,
                description: p.description,
                bannerUrl: p.bannerUrl,
                displayOrder: p.displayOrder,
                isActive: true,
            }
        })
    }
    console.log('✅ Promos seeded')

    // 4.7 Create Tables for Dine-in
    for (let i = 1; i <= 10; i++) {
        const tableNum = i.toString().padStart(2, '0')
        await prisma.table.create({
            data: {
                outletId: firstOutlet.id,
                tableNumber: tableNum,
                qrCode: `ATASKOPI-TABLE-${tableNum}`,
                isOccupied: false,
            }
        })
    }
    console.log('✅ Tables seeded: 10 tables')

    // 4.8 Create Test Users with bcrypt
    const pinHash = await bcrypt.hash('123456', 10)

    const customerUser = await prisma.user.create({
        data: {
            phone: '+6281234567890',
            name: 'John Doe (Customer)',
            email: 'customer@ataskopi.com',
            pinHash,
            loyaltyPoints: 150,
            totalItemsPurchased: 15,
            totalSpent: 525000,
            currentTierId: tiers[1].id, // Silver tier
            role: 'customer',
        },
    })

    const adminUser = await prisma.user.create({
        data: {
            phone: '+6281234567891',
            name: 'Admin User',
            email: 'admin@ataskopi.com',
            pinHash,
            role: 'admin',
        },
    })

    const kasirUser = await prisma.user.create({
        data: {
            phone: '+6281234567892',
            name: 'Kasir User',
            email: 'kasir@ataskopi.com',
            pinHash,
            role: 'kasir',
            outletId: firstOutlet.id,
        },
    })

    console.log('✅ Test users seeded (Customer, Admin, Kasir) - PIN: 123456')

    // 5. Create Products & Options
    const createProduct = async (
        catSlug: string,
        name: string,
        desc: string,
        price: number,
        imageUrl: string | null,
        options: any[] = [],
        modifiers: any[] = []
    ) => {
        const categoryId = categoryMap.get(catSlug)
        if (!categoryId) return

        await prisma.product.create({
            data: {
                categoryId: categoryId,
                name: name,
                description: desc,
                basePrice: price,
                imageUrl: imageUrl,
                isAvailable: true,
                options: {
                    create: options.map((opt, idx) => ({
                        name: opt.name,
                        minSelect: opt.min || 1,
                        maxSelect: opt.max || 1,
                        sortOrder: idx + 1,
                        values: {
                            create: opt.values.map((val: any, vIdx: number) => ({
                                name: val.name,
                                priceModifier: val.price || 0,
                                sortOrder: vIdx + 1
                            }))
                        }
                    }))
                },
                modifiers: {
                    create: modifiers.map((mod, idx) => ({
                        name: mod.name,
                        price: mod.price || 0,
                        sortOrder: idx + 1
                    }))
                }
            }
        })
    }

    // --- COFFEE ---
    await createProduct(
        'coffee',
        'Kopsu Atas Aren',
        'Kopi susu gula aren asli, rasa creamy dan pas.',
        12000,
        '/images/products/aren-latte.jpg',
        [
            { name: 'Varian', values: [{ name: 'Hot' }, { name: 'Ice', price: 0 }] },
            { name: 'Size', values: [{ name: 'Regular' }, { name: 'Large', price: 6000 }] },
            { name: 'Sugar', values: [{ name: 'Normal' }, { name: 'Less' }, { name: 'No Sugar' }] },
            { name: 'Ice Level', values: [{ name: 'Normal' }, { name: 'Less' }, { name: 'No Ice' }] },
        ],
        [
            { name: 'Extra Shot Espresso', price: 3000 },
        ]
    )

    await createProduct(
        'coffee',
        'Sweet Caramel Latte',
        'Espresso dengan susu dan sirup caramel premium.',
        12000,
        '/images/products/caramel-macchiato.jpg',
        [
            { name: 'Varian', values: [{ name: 'Hot' }, { name: 'Ice', price: 0 }] },
            { name: 'Size', values: [{ name: 'Regular' }, { name: 'Large', price: 6000 }] },
            { name: 'Sugar', values: [{ name: 'Normal' }, { name: 'Less' }, { name: 'No Sugar' }] },
            { name: 'Ice Level', values: [{ name: 'Normal' }, { name: 'Less' }, { name: 'No Ice' }] },
        ],
        [
            { name: 'Extra Shot Espresso', price: 3000 },
        ]
    )

    await createProduct(
        'coffee',
        'Ice Black Coffee',
        'Double shot espresso dengan air mineral dan es batu.',
        8000,
        '/images/products/americano.jpg',
        [
            { name: 'Varian', values: [{ name: 'Hot' }, { name: 'Ice', price: 0 }] },
            { name: 'Size', values: [{ name: 'Regular' }, { name: 'Large', price: 5000 }] },
        ],
        [
            { name: 'Extra Shot Espresso', price: 3000 },
        ]
    )

    // --- NON COFFEE ---
    await createProduct(
        'non-coffee',
        'Matcha Latte',
        'Matcha premium Jepang dipadu dengan susu segar.',
        14000,
        '/images/products/matcha-latte.jpg',
        [
            { name: 'Varian', values: [{ name: 'Hot' }, { name: 'Ice' }] },
            { name: 'Milk Base', values: [{ name: 'Fresh Milk' }, { name: 'Oatmilk', price: 8000 }] },
            { name: 'Sugar', values: [{ name: 'Normal' }, { name: 'Less' }, { name: 'No Sugar' }] },
        ],
        [
            { name: 'Extra Matcha Shot', price: 7000 },
            { name: 'Red Bean Topping', price: 5000 },
        ]
    )

    // --- FOOD ---
    await createProduct(
        'food-snacks',
        'Nasi Goreng Rempah',
        'Nasi goreng bumbu nusantara dengan telur.',
        38000,
        '/images/products/nasi-goreng-rempah.jpg',
        [
            { name: 'Pedas', values: [{ name: 'Tidak Pedas' }, { name: 'Sedang' }, { name: 'Pedas' }] },
            { name: 'Telur', values: [{ name: 'Ceplok' }, { name: 'Dadar' }, { name: 'Orak-arik' }] },
        ],
        [
            { name: 'Ekstra Ayam Suwir', price: 8000 },
            { name: 'Keju Slice', price: 4000 },
        ]
    )

    console.log('✅ Products seeded')

    // 6. Create Test Orders for History
    const arenLatte = await prisma.product.findFirst({ where: { name: 'Kopsu Atas Aren' } })
    const nasiGoreng = await prisma.product.findFirst({ where: { name: 'Nasi Goreng Rempah' } })

    if (arenLatte && nasiGoreng) {
        // Order 1: Active
        await prisma.order.create({
            data: {
                userId: customerUser.id,
                outletId: firstOutlet.id,
                tableId: null,
                orderNumber: '0001013009-001',
                orderType: 'takeaway',
                subtotal: 50000,
                tax: 5500,
                total: 55500,
                orderStatus: 'preparing',
                paymentStatus: 'paid',
                paymentMethod: 'qris',
                items: {
                    create: [
                        {
                            productId: arenLatte.id,
                            quantity: 1,
                            unitPrice: 25000,
                            notes: 'Less sugar',
                        },
                        {
                            productId: arenLatte.id,
                            quantity: 1,
                            unitPrice: 25000,
                            notes: 'Normal',
                        }
                    ]
                }
            }
        });

        // Order 2: Completed
        await prisma.order.create({
            data: {
                userId: customerUser.id,
                outletId: firstOutlet.id,
                tableId: null,
                orderNumber: '0001012909-005',
                orderType: 'dine_in',
                subtotal: 38000,
                tax: 4180,
                total: 42180,
                orderStatus: 'completed',
                paymentStatus: 'paid',
                paymentMethod: 'cash',
                items: {
                    create: [
                        {
                            productId: nasiGoreng.id,
                            quantity: 1,
                            unitPrice: 38000,
                            notes: 'Pedas',
                        }
                    ]
                }
            }
        });

        console.log('✅ Test orders seeded')
    }

    // 7. Seed Fixed Assets
    const mesinEspresso = await prisma.asset.create({
        data: {
            outletId: firstOutlet.id,
            name: 'Mesin Espresso',
            purchaseDate: new Date('2026-05-01T00:00:00Z'),
            purchasePrice: 5000000,
            status: 'ACTIVE',
            notes: 'Mesin Espresso La Marzocco'
        }
    })

    const grinderKopi = await prisma.asset.create({
        data: {
            outletId: firstOutlet.id,
            name: 'Grinder Kopi',
            purchaseDate: new Date('2026-05-01T00:00:00Z'),
            purchasePrice: 2000000,
            status: 'ACTIVE',
            notes: 'Grinder Mahlkonig EK43'
        }
    })

    console.log('✅ Assets seeded')

    // 8. Seed Raw Materials
    const bijiKopi = await prisma.rawMaterial.create({
        data: {
            outletId: firstOutlet.id,
            name: 'Biji Kopi Arabika',
            sku: 'RAW-001',
            unit: 'g',
            currentStock: 4000,
            averageCost: 110
        }
    })

    const susuSegar = await prisma.rawMaterial.create({
        data: {
            outletId: firstOutlet.id,
            name: 'Susu Segar',
            sku: 'RAW-002',
            unit: 'ml',
            currentStock: 8000,
            averageCost: 20
        }
    })

    const gulaAren = await prisma.rawMaterial.create({
        data: {
            outletId: firstOutlet.id,
            name: 'Gula Aren',
            sku: 'RAW-003',
            unit: 'g',
            currentStock: 2500,
            averageCost: 25
        }
    })

    console.log('✅ Raw Materials seeded')

    // 9. Seed Inventory Purchases (Purchase History)
    await prisma.inventoryPurchase.createMany({
        data: [
            {
                outletId: firstOutlet.id,
                rawMaterialId: bijiKopi.id,
                date: new Date('2026-05-25T00:00:00Z'),
                quantity: 5000,
                unitPrice: 110,
                totalAmount: 550000,
                supplier: 'Kopi Supply Co',
                notes: 'Beli stok awal biji kopi'
            },
            {
                outletId: firstOutlet.id,
                rawMaterialId: susuSegar.id,
                date: new Date('2026-05-28T00:00:00Z'),
                quantity: 10000,
                unitPrice: 20,
                totalAmount: 200000,
                supplier: 'Dairy Farm',
                notes: 'Susu segar mingguan'
            },
            {
                outletId: firstOutlet.id,
                rawMaterialId: gulaAren.id,
                date: new Date('2026-05-28T00:00:00Z'),
                quantity: 3000,
                unitPrice: 25,
                totalAmount: 75000,
                supplier: 'Gula Supply',
                notes: 'Gula aren cair premium'
            }
        ]
    })

    console.log('✅ Inventory Purchases seeded')

    // 10. Seed Stock Opname (completed to show COGS)
    await prisma.stockOpname.create({
        data: {
            outletId: firstOutlet.id,
            date: new Date('2026-06-01T00:00:00Z'),
            status: 'COMPLETED',
            notes: 'Stock opname akhir mei / awal juni',
            cogsAmount: 162500,
            items: {
                create: [
                    {
                        rawMaterialId: bijiKopi.id,
                        systemStock: 5000,
                        actualStock: 4000,
                        difference: -1000,
                        unitCost: 110,
                        cogsValue: 110000
                    },
                    {
                        rawMaterialId: susuSegar.id,
                        systemStock: 10000,
                        actualStock: 8000,
                        difference: -2000,
                        unitCost: 20,
                        cogsValue: 40000
                    },
                    {
                        rawMaterialId: gulaAren.id,
                        systemStock: 3000,
                        actualStock: 2500,
                        difference: -500,
                        unitCost: 25,
                        cogsValue: 12500
                    }
                ]
            }
        }
    })

    console.log('✅ Stock Opname / COGS seeded')

    // 11. Seed Daily Real Revenues (Manual record)
    await prisma.dailyRealRevenue.createMany({
        data: [
            {
                outletId: firstOutlet.id,
                date: new Date('2026-05-31T00:00:00Z'),
                cashAmount: 358000,
                notes: 'Omset real catatan manual'
            },
            {
                outletId: firstOutlet.id,
                date: new Date('2026-06-01T00:00:00Z'),
                cashAmount: 389000,
                notes: 'Omset real catatan manual'
            },
            {
                outletId: firstOutlet.id,
                date: new Date('2026-06-02T00:00:00Z'),
                cashAmount: 266000,
                notes: 'Omset real catatan manual'
            }
        ]
    })

    console.log('✅ Daily Real Revenues seeded')

    // 12. Seed Operating Expenses (Opex)
    await prisma.expense.createMany({
        data: [
            {
                outletId: firstOutlet.id,
                date: new Date('2026-05-31T00:00:00Z'),
                category: 'OPERATIONAL',
                amount: 50000,
                description: 'Gas LPG & air galon'
            },
            {
                outletId: firstOutlet.id,
                date: new Date('2026-06-01T00:00:00Z'),
                category: 'SALARY',
                amount: 100000,
                description: 'Gaji harian kasir'
            },
            {
                outletId: firstOutlet.id,
                date: new Date('2026-06-02T00:00:00Z'),
                category: 'UTILITY',
                amount: 40000,
                description: 'Token listrik mingguan'
            }
        ]
    })

    console.log('✅ Operating Expenses seeded')

    console.log('🎉 Seeding completed successfully!')
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
