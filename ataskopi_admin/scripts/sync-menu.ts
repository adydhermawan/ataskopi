/**
 * Sync the menu (categories, products, options) to the current printed menu.
 *
 * Safe for production data:
 *   - Never deletes a product, option, option value or modifier. Old orders keep
 *     pointing at the same rows, so sales history and receipts stay intact.
 *   - Existing products are matched by name and updated in place (rename, price,
 *     category), so their sales history continues under the new name.
 *   - Products, options, values and modifiers that are not on the menu are only
 *     hidden (isAvailable = false).
 *   - Idempotent: running it twice changes nothing the second time.
 *   - Dry run by default: all changes run inside one transaction that is rolled back.
 *     Pass --apply to commit.
 *
 * Usage (from ataskopi_admin/):
 *   npx ts-node -O '{"module":"commonjs"}' scripts/sync-menu.ts            # dry run, .env database
 *   npx ts-node -O '{"module":"commonjs"}' scripts/sync-menu.ts --apply    # commit, .env database
 *   MENU_DB_URL='postgresql://...' npx ts-node ... scripts/sync-menu.ts [--apply]
 *
 * Product photos (scripts/menu-photos/*.jpg) are uploaded to Supabase Storage bucket
 * `images` under `menu/` only with --apply and when SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are set. A photo is only attached to a product that has
 * no image yet, so photos set in the admin are never overwritten.
 *
 * Old prices in order_items are stored per order (unit_price), so price changes
 * only affect new orders.
 */
import { Prisma, PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

type OptionSpec = { name: string; match: string[]; values: { name: string; match?: string[] }[] }
// photo: file in scripts/menu-photos/, used only when the product has no image yet.
type ProductSpec = { name: string; price: number; match?: string[]; photo?: string }
type CategorySpec = {
    slug: string
    name: string
    sortOrder: number
    options: OptionSpec[]
    products: ProductSpec[]
}

// First value of each option is the default.
const SERVE: OptionSpec = {
    name: 'Serve',
    match: ['Serve', 'Varian', 'Temperature'],
    values: [{ name: 'Ice' }, { name: 'Hot' }],
}
const SERVE_ICE_ONLY: OptionSpec = { ...SERVE, values: [{ name: 'Ice' }] }
const COFFEE: OptionSpec = {
    name: 'Coffee',
    match: ['Coffee', 'Strength', 'Coffee Strength'],
    values: [{ name: 'Normal' }, { name: 'Strong' }],
}
const SUGAR: OptionSpec = {
    name: 'Sugar',
    match: ['Sugar', 'Sugar Level'],
    values: [{ name: 'Normal' }, { name: 'Less', match: ['Less', 'Lesss'] }, { name: 'No Sugar' }, { name: 'More' }],
}

const MENU: CategorySpec[] = [
    {
        slug: 'coffee',
        name: 'Coffee',
        sortOrder: 1,
        options: [SERVE, COFFEE, SUGAR],
        products: [
            { name: 'Kopsu Atas Aren', price: 12000 },
            { name: 'Sweet Caramel Latte', price: 12000 },
            { name: 'Butterscotch Latte', price: 12000, match: ['Butterscotcth latte'] },
            { name: 'Hazelnut Latte', price: 12000, photo: 'hazelnut-latte.jpg' },
            { name: 'Cappuccino Ice', price: 12000, match: ['Ice Cappuccino'] },
            { name: 'V60 Pour Over', price: 15000, match: ['Filter Coffee V60'] },
            { name: 'Americano', price: 8000, match: ['Ice Black Coffee'] },
            { name: 'Kopitiam Coffee Milk', price: 10000 },
        ],
    },
    {
        slug: 'mocktail-coffee',
        name: 'Mocktail Coffee',
        sortOrder: 2,
        options: [SERVE_ICE_ONLY, COFFEE, SUGAR],
        products: [
            { name: 'Salted Caramel Mocktail', price: 12000, match: ['Salted caramel americano'] },
            { name: 'Berry Mocktail Coffee', price: 12000, photo: 'berry-mocktail-coffee.jpg' },
            { name: 'Creamy Citrus Coffee', price: 12000, photo: 'creamy-citrus-coffee.jpg' },
        ],
    },
    {
        slug: 'non-coffee',
        name: 'Non Coffee',
        sortOrder: 3,
        options: [SERVE, SUGAR],
        products: [
            { name: 'Dark Chocolate Sweet', price: 12000 },
            { name: 'Hazelnut Choco', price: 12000 },
            { name: 'Matcha Latte', price: 14000 },
            { name: 'Salted Cloud Matcha', price: 15000, photo: 'salted-cloud-matcha.jpg' },
            { name: 'Red Velvet', price: 12000, match: ['Redvelvet'] },
            { name: 'Taro', price: 12000 },
        ],
    },
]
// Categories kept but pushed after the drinks. Their products are hidden.
const TRAILING_CATEGORY_SLUGS = ['food-snacks', 'pastry']

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
const matches = (name: string, candidates: string[]) => candidates.map(norm).includes(norm(name))

const apply = process.argv.includes('--apply')
const dbUrl = process.env.MENU_DB_URL
const prisma = new PrismaClient(dbUrl ? { datasourceUrl: dbUrl } : undefined)

class DryRun extends Error {}

const PHOTO_DIR = path.join(__dirname, 'menu-photos')
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'images'
// photo file -> public URL, filled before the DB transaction (uploads happen only with --apply).
const photoUrls = new Map<string, string>()

async function uploadPhotos() {
    const files = MENU.flatMap((c) => c.products.map((p) => p.photo)).filter((f): f is string => !!f)
    for (const f of files) {
        if (!fs.existsSync(path.join(PHOTO_DIR, f))) throw new Error(`Missing photo ${f} in ${PHOTO_DIR}`)
    }
    if (!supabaseUrl || !supabaseKey) {
        console.log('Photos: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set, photos are skipped.\n')
        return
    }
    const supabase = createClient(supabaseUrl, supabaseKey)
    for (const f of files) {
        const objectPath = `menu/${f}`
        if (apply) {
            const { error } = await supabase.storage
                .from(bucket)
                .upload(objectPath, fs.readFileSync(path.join(PHOTO_DIR, f)), {
                    contentType: 'image/jpeg',
                    cacheControl: '3600',
                    upsert: true,
                })
            if (error) throw new Error(`Upload ${f} failed: ${error.message}`)
        }
        photoUrls.set(f, supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl)
    }
    console.log(`Photos: ${files.length} ${apply ? 'uploaded' : 'would be uploaded'} to ${bucket}/menu/\n`)
}

const log: string[] = []
const note = (msg: string) => log.push(msg)

async function sync(tx: Prisma.TransactionClient) {
    // ---- Categories
    const categoryIds = new Map<string, string>()
    for (const cat of MENU) {
        const existing = await tx.category.findUnique({ where: { slug: cat.slug } })
        if (!existing) {
            const created = await tx.category.create({
                data: { slug: cat.slug, name: cat.name, sortOrder: cat.sortOrder },
            })
            note(`+ category "${cat.name}"`)
            categoryIds.set(cat.slug, created.id)
            continue
        }
        if (existing.name !== cat.name || existing.sortOrder !== cat.sortOrder) {
            await tx.category.update({
                where: { id: existing.id },
                data: { name: cat.name, sortOrder: cat.sortOrder },
            })
            note(`~ category "${existing.name}" -> "${cat.name}" (sort ${cat.sortOrder})`)
        }
        categoryIds.set(cat.slug, existing.id)
    }
    for (const [i, slug] of TRAILING_CATEGORY_SLUGS.entries()) {
        const sortOrder = MENU.length + 1 + i
        const existing = await tx.category.findUnique({ where: { slug } })
        if (existing && existing.sortOrder !== sortOrder) {
            await tx.category.update({ where: { id: existing.id }, data: { sortOrder } })
            note(`~ category "${existing.name}" sort ${existing.sortOrder} -> ${sortOrder}`)
        }
    }

    // ---- Products
    const allProducts = await tx.product.findMany({ orderBy: { createdAt: 'asc' } })
    const claimed = new Set<string>()

    for (const cat of MENU) {
        const categoryId = categoryIds.get(cat.slug)!
        for (const spec of cat.products) {
            const candidates = [spec.name, ...(spec.match ?? [])]
            const found = allProducts.filter((p) => !claimed.has(p.id) && matches(p.name, candidates))
            // Prefer the product with the exact new name, then an available one.
            found.sort(
                (a, b) =>
                    Number(norm(b.name) === norm(spec.name)) - Number(norm(a.name) === norm(spec.name)) ||
                    Number(b.isAvailable) - Number(a.isAvailable)
            )
            let product = found[0]

            if (!product) {
                product = await tx.product.create({
                    data: { name: spec.name, categoryId, basePrice: spec.price, isAvailable: true },
                })
                note(`+ product "${spec.name}" [${cat.name}] ${spec.price}`)
                if (spec.photo && !photoUrls.has(spec.photo)) note(`  ! ${spec.name}: no photo (skipped)`)
            } else {
                const changes: string[] = []
                if (product.name !== spec.name) changes.push(`name "${product.name}" -> "${spec.name}"`)
                if (Number(product.basePrice) !== spec.price)
                    changes.push(`price ${Number(product.basePrice)} -> ${spec.price}`)
                if (product.categoryId !== categoryId) changes.push(`category -> ${cat.name}`)
                if (!product.isAvailable) changes.push('available')
                if (changes.length) {
                    await tx.product.update({
                        where: { id: product.id },
                        data: { name: spec.name, basePrice: spec.price, categoryId, isAvailable: true },
                    })
                    note(`~ product "${product.name}": ${changes.join(', ')}`)
                }
            }
            const photoUrl = spec.photo ? photoUrls.get(spec.photo) : undefined
            if (photoUrl && !product.imageUrl) {
                await tx.product.update({ where: { id: product.id }, data: { imageUrl: photoUrl } })
                note(`  ~ ${spec.name}: photo ${spec.photo}`)
            }
            claimed.add(product.id)
            await syncOptions(tx, product.id, spec.name, cat.options)
            await hideModifiers(tx, product.id, spec.name)
        }
    }

    // Anything not on the menu is hidden, never deleted.
    for (const p of allProducts) {
        if (claimed.has(p.id) || !p.isAvailable) continue
        await tx.product.update({ where: { id: p.id }, data: { isAvailable: false } })
        note(`- product "${p.name}" hidden (not on menu)`)
    }
}

async function syncOptions(tx: Prisma.TransactionClient, productId: string, productName: string, specs: OptionSpec[]) {
    const options = await tx.productOption.findMany({
        where: { productId },
        include: { values: true },
        orderBy: [{ isAvailable: 'desc' }, { sortOrder: 'asc' }],
    })
    const used = new Set<string>()

    for (const [oi, spec] of specs.entries()) {
        let option = options.find((o) => !used.has(o.id) && matches(o.name, [spec.name, ...spec.match]))
        if (!option) {
            option = await tx.productOption.create({
                data: { productId, name: spec.name, minSelect: 1, maxSelect: 1, sortOrder: oi, isAvailable: true },
                include: { values: true },
            })
            note(`  + ${productName}: option "${spec.name}"`)
        } else if (
            option.name !== spec.name ||
            option.minSelect !== 1 ||
            option.maxSelect !== 1 ||
            option.sortOrder !== oi ||
            !option.isAvailable
        ) {
            await tx.productOption.update({
                where: { id: option.id },
                data: { name: spec.name, minSelect: 1, maxSelect: 1, sortOrder: oi, isAvailable: true },
            })
            note(`  ~ ${productName}: option ${option.name === spec.name ? `"${spec.name}" order/settings fixed` : `"${option.name}" -> "${spec.name}"`}`)
        }
        used.add(option.id)

        const usedValues = new Set<string>()
        for (const [vi, vSpec] of spec.values.entries()) {
            const isDefault = vi === 0
            const vCandidates = [vSpec.name, ...(vSpec.match ?? [])]
            const value = option.values
                .filter((v) => !usedValues.has(v.id) && matches(v.name, vCandidates))
                .sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable))[0]
            if (!value) {
                const created = await tx.productOptionValue.create({
                    data: { optionId: option.id, name: vSpec.name, priceModifier: 0, isDefault, sortOrder: vi, isAvailable: true },
                })
                usedValues.add(created.id)
                note(`    + ${productName} / ${spec.name}: "${vSpec.name}"${isDefault ? ' (default)' : ''}`)
                continue
            }
            usedValues.add(value.id)
            if (
                value.name !== vSpec.name ||
                Number(value.priceModifier) !== 0 ||
                value.isDefault !== isDefault ||
                value.sortOrder !== vi ||
                !value.isAvailable
            ) {
                await tx.productOptionValue.update({
                    where: { id: value.id },
                    data: { name: vSpec.name, priceModifier: 0, isDefault, sortOrder: vi, isAvailable: true },
                })
                const label =
                    value.name !== vSpec.name
                        ? `"${value.name}" -> "${vSpec.name}"`
                        : !value.isAvailable
                          ? `"${vSpec.name}" shown`
                          : `"${vSpec.name}" order/default fixed`
                note(`    ~ ${productName} / ${spec.name}: ${label}${isDefault ? ' (default)' : ''}`)
            }
        }
        for (const v of option.values) {
            if (usedValues.has(v.id) || (!v.isAvailable && !v.isDefault)) continue
            await tx.productOptionValue.update({ where: { id: v.id }, data: { isAvailable: false, isDefault: false } })
            note(`    - ${productName} / ${spec.name}: "${v.name}" hidden`)
        }
    }

    for (const o of options) {
        if (used.has(o.id) || !o.isAvailable) continue
        await tx.productOption.update({ where: { id: o.id }, data: { isAvailable: false } })
        await tx.productOptionValue.updateMany({ where: { optionId: o.id }, data: { isAvailable: false } })
        note(`  - ${productName}: option "${o.name}" hidden`)
    }
}

async function hideModifiers(tx: Prisma.TransactionClient, productId: string, productName: string) {
    const mods = await tx.productModifier.findMany({ where: { productId, isAvailable: true } })
    for (const m of mods) {
        await tx.productModifier.update({ where: { id: m.id }, data: { isAvailable: false } })
        note(`  - ${productName}: add-on "${m.name}" hidden`)
    }
}

async function main() {
    const target = (dbUrl ?? process.env.POSTGRES_PRISMA_URL ?? '').replace(/\/\/[^@]*@/, '//***@')
    console.log(`Database: ${target || '(from prisma env)'}`)
    console.log(`Mode: ${apply ? 'APPLY (commit)' : 'DRY RUN (rollback)'}\n`)
    await uploadPhotos()

    try {
        await prisma.$transaction(
            async (tx) => {
                await sync(tx)
                if (!apply) throw new DryRun()
            },
            { timeout: 120_000, maxWait: 20_000 }
        )
    } catch (e) {
        if (!(e instanceof DryRun)) throw e
    }

    console.log(log.length ? log.join('\n') : 'Menu already up to date. No changes.')
    console.log(`\n${log.length} change(s) ${apply ? 'committed' : 'would be made (nothing written)'}.`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
