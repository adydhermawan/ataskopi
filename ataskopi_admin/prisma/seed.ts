
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    // 1. Clean up existing data (Clean Slate for Single Tenant)
    console.log('🧹 Cleaning up old data...')
    await prisma.orderItemOption.deleteMany() // Add deep cleanup
    await prisma.orderItemModifier.deleteMany()
    await prisma.orderItem.deleteMany()
    await prisma.loyaltyTransaction.deleteMany() // Add loyalty tx cleanup
    await prisma.order.deleteMany()
    await prisma.productModifier.deleteMany()
    await prisma.productOptionValue.deleteMany()
    await prisma.productOption.deleteMany()
    await prisma.product.deleteMany()
    await prisma.category.deleteMany()
    await prisma.userVoucher.deleteMany() // Add user vouchers cleanup BEFORE voucher cleanup
    await prisma.voucher.deleteMany()
    await prisma.table.deleteMany()
    await prisma.outlet.deleteMany()
    await prisma.notification.deleteMany() // Clean notifications first
    await prisma.userAddress.deleteMany() // Clean user addresses
    await prisma.user.deleteMany()
    await prisma.membershipTier.deleteMany() // Added tier cleanup
    await prisma.loyaltySetting.deleteMany() // Added loyalty settings cleanup
    await prisma.promo.deleteMany() // Added promo cleanup
    // await prisma.tenant.deleteMany() // Tenant table removed
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
            where: {
                slug: cat.slug
            },
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

    // 3. Create Outlets
    const outletsData = [
        { name: 'Vibe Coffee - Ungaran', address: 'Jl. Diponegoro No. 12, Ungaran Barat, Kab. Semarang', lat: -7.1350, lng: 110.4000 },
        { name: 'Vibe Coffee - Semarang Kota', address: 'Jl. Pandanaran No. 45, Kota Semarang', lat: -6.9839, lng: 110.4104 },
    ]

    for (const outlet of outletsData) {
        await prisma.outlet.create({
            data: {
                name: outlet.name,
                address: outlet.address,
                latitude: outlet.lat,
                longitude: outlet.lng,
            }
        })
    }

    console.log('✅ Outlets seeded')

    // 4. Create Vouchers (Rewards & Promos)
    const vouchersData = [
        // Redeemable Reward (Costs Points)
        {
            code: 'KOPIHEMAT',
            discountType: 'fixed',
            discountValue: 10000,
            minOrder: 30000,
            desc: 'Potongan Rp 10.000, Tukar 50 Poin',
            pointCost: 50,
            isRedeemable: true
        },
        // Free Reward (0 Points, e.g. Welcome Gift)
        {
            code: 'USERBARU',
            discountType: 'percentage',
            discountValue: 20,
            maxDiscount: 15000,
            desc: 'Diskon 20% Pengguna Baru (Gratis Redeem)',
            pointCost: 0,
            isRedeemable: true
        },
        // Promo Code (Not Redeemable via Points, just hidden code)
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
            where: {
                code: v.code
            },
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
    // First enable check if exists
    const existingSettings = await prisma.loyaltySetting.findFirst()
    if (!existingSettings) {
        await prisma.loyaltySetting.create({
            data: {
                isEnabled: true,
                pointsPerItem: 1,
                pointValueIdr: 1000,
                minPointsToRedeem: 10,
                maxPointsPerTransaction: 100,
            }
        })
    }

    console.log('✅ Loyalty settings seeded')

    // 4.6 Create Membership Tiers
    const tiers = await Promise.all([
        prisma.membershipTier.upsert({
            where: { tierLevel: 1 },
            update: {},
            create: {
                tierLevel: 1,
                tierName: 'Bronze',
                minPoints: 0,
                maxPoints: 100,
                benefitsDescription: 'Basic member benefits',
            },
        }),
        prisma.membershipTier.upsert({
            where: { tierLevel: 2 },
            update: {},
            create: {
                tierLevel: 2,
                tierName: 'Silver',
                minPoints: 100,
                maxPoints: 500,
                benefitsDescription: 'Access to tier-specific vouchers and priority support',
            },
        }),
        prisma.membershipTier.upsert({
            where: { tierLevel: 3 },
            update: {},
            create: {
                tierLevel: 3,
                tierName: 'Gold',
                minPoints: 500,
                maxPoints: null,
                benefitsDescription: 'Exclusive vouchers, priority support, and special events access',
            },
        }),
    ])

    console.log('✅ Membership tiers seeded:', tiers.map(t => t.tierName).join(', '))

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
    const firstOutlet = await prisma.outlet.findFirst()
    if (firstOutlet) {
        for (let i = 1; i <= 10; i++) {
            const tableNum = i.toString().padStart(2, '0')
            // Composite key outletId_tableNumber assumed exist or findUnique replacement
            const existingTable = await prisma.table.findFirst({
                where: {
                    outletId: firstOutlet.id,
                    tableNumber: tableNum
                }
            })

            if (!existingTable) {
                await prisma.table.create({
                    data: {
                        outletId: firstOutlet.id,
                        tableNumber: tableNum,
                        qrCode: `ATASKOPI-TABLE-${tableNum}`,
                        isOccupied: false,
                    }
                })
            }
        }
        console.log('✅ Tables seeded: 10 tables')
    }

    // 4.8 Create Test Users with bcrypt
    const pinHash = await bcrypt.hash('123456', 10)

    const customerUser = await prisma.user.upsert({
        where: { phone: '+6281234567890' },
        update: {},
        create: {
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

    const adminUser = await prisma.user.upsert({
        where: { phone: '+6281234567891' },
        update: {},
        create: {
            phone: '+6281234567891',
            name: 'Admin User',
            email: 'admin@ataskopi.com',
            pinHash,
            role: 'admin',
        },
    })

    const kasirUser = await prisma.user.upsert({
        where: { phone: '+6281234567892' },
        update: {},
        create: {
            phone: '+6281234567892',
            name: 'Kasir User',
            email: 'kasir@ataskopi.com',
            pinHash,
            role: 'kasir',
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

        // Check if product exists to avoid dups in rerun (simple check by name for seed)
        const existing = await prisma.product.findFirst({
            where: { name: name }
        })

        if (existing) return; // Skip if exists

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

    // Aren Latte
    await createProduct(
        'coffee',
        'Aren Latte (Signature)',
        'Kopi susu gula aren asli, rasa creamy dan pas.',
        25000,
        '/images/products/aren-latte.jpg',
        [
            { name: 'Varian', values: [{ name: 'Hot' }, { name: 'Ice' }] },
            { name: 'Size', values: [{ name: 'Regular' }, { name: 'Large', price: 6000 }] },
            { name: 'Sugar', values: [{ name: 'Normal' }, { name: 'Less' }, { name: 'No Sugar' }] },
            { name: 'Ice Level', values: [{ name: 'Normal' }, { name: 'Less' }, { name: 'No Ice' }] },
        ],
        [
            { name: 'Extra Shot', price: 5000 },
            { name: 'Oatmilk Upgrade', price: 8000 },
            { name: 'Jelly Aren', price: 4000 },
        ]
    )

    // Caramel Macchiato
    await createProduct(
        'coffee',
        'Caramel Macchiato',
        'Espresso dengan susu dan sirup caramel premium.',
        35000,
        '/images/products/caramel-macchiato.jpg',
        [
            { name: 'Varian', values: [{ name: 'Hot' }, { name: 'Ice' }] },
            { name: 'Size', values: [{ name: 'Regular' }, { name: 'Large', price: 6000 }] },
            { name: 'Sugar', values: [{ name: 'Normal' }, { name: 'Less' }, { name: 'No Sugar' }] },
        ],
        [
            { name: 'Extra Caramel Sauce', price: 3000 },
            { name: 'Whipped Cream', price: 5000 },
        ]
    )

    // Americano
    await createProduct(
        'coffee',
        'Americano',
        'Double shot espresso dengan air mineral.',
        20000,
        '/images/products/americano.jpg',
        [
            { name: 'Varian', values: [{ name: 'Hot' }, { name: 'Ice' }] },
            { name: 'Size', values: [{ name: 'Regular' }, { name: 'Large', price: 5000 }] },
        ],
        [
            { name: 'Extra Shot', price: 5000 },
        ]
    )

    // --- NON COFFEE ---

    // Matcha Latte
    await createProduct(
        'non-coffee',
        'Matcha Latte',
        'Matcha premium Jepang dipadu dengan susu segar.',
        28000,
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

    // Classic Chocolate
    await createProduct(
        'non-coffee',
        'Classic Chocolate',
        'Cokelat dark kental dan kaya rasa.',
        25000,
        '/images/products/classic-chocolate.jpg',
        [
            { name: 'Varian', values: [{ name: 'Hot' }, { name: 'Ice' }] },
            { name: 'Sugar', values: [{ name: 'Normal' }, { name: 'Less' }, { name: 'No Sugar' }] },
        ],
        [
            { name: 'Whipped Cream', price: 5000 },
            { name: 'Marshmallow', price: 4000 },
        ]
    )

    // --- FOOD ---

    // Nasi Goreng Rempah
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

    // French Fries
    await createProduct(
        'food-snacks',
        'French Fries',
        'Kentang renyah dengan bumbu pilihan.',
        22000,
        '/images/products/french-fries.jpg',
        [
            { name: 'Bumbu', values: [{ name: 'Original' }, { name: 'BBQ' }, { name: 'Seaweed' }] },
        ],
        [
            { name: 'Cheese Sauce', price: 4000 },
            { name: 'Mayonnaise', price: 2000 },
        ]
    )

    // --- PASTRY ---

    // Almond Croissant
    await createProduct(
        'pastry',
        'Almond Croissant',
        'Pastry renyah dengan isian pasta almond.',
        32000,
        '/images/products/almond-croissant.jpg',
        [
            { name: 'Sajian', values: [{ name: 'Dine-in (Warm)' }, { name: 'Takeaway (Original)' }] },
        ],
        [
            { name: 'Vanilla Ice Cream Scoop', price: 8000 },
            { name: 'Melted Chocolate Side', price: 5000 },
        ]
    )

    console.log('✅ Products seeded')

    // 6. Create Test Orders for History
    // Get seeded products
    const arenLatte = await prisma.product.findFirst({ where: { name: 'Aren Latte (Signature)' } })
    const nasiGoreng = await prisma.product.findFirst({ where: { name: 'Nasi Goreng Rempah' } })

    if (arenLatte && nasiGoreng) {
        // Order 1: Active (Preparing)
        const order1 = await prisma.order.create({
            data: {
                userId: customerUser.id,
                outletId: firstOutlet?.id || '',
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

        // Order 2: Completed (History)
        const order2 = await prisma.order.create({
            data: {
                userId: customerUser.id,
                outletId: firstOutlet?.id || '',
                tableId: null,
                orderNumber: '0001012909-005',
                orderType: 'dine_in',
                subtotal: 38000,
                tax: 4180,
                total: 42180,
                orderStatus: 'completed', // Status for History tab
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

        console.log('✅ Test orders seeded (1 Active, 1 Completed)')
    }

    console.log('🎉 Seeding completed!')
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
