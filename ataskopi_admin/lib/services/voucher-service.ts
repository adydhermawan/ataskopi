
import { db as prisma } from "@/lib/db"


export type ValidationResult = {
    valid: boolean
    discount: number
    error?: string
}

export async function validateVoucher(
    code: string,
    userId: string,
    subtotal: number,
    orderType: string,
    cartItems: { productId: string, categoryId: string, price: number, quantity: number }[]
): Promise<ValidationResult> {
    const voucher = await prisma.voucher.findUnique({
        where: { code: code.toUpperCase() },
        include: { userVouchers: { where: { userId } } }
    })

    if (!voucher) return { valid: false, discount: 0, error: "Voucher tidak ditemukan" }
    if (!voucher.isActive) return { valid: false, discount: 0, error: "Voucher tidak aktif" }

    const now = new Date()
    if (voucher.startDate && now < voucher.startDate) return { valid: false, discount: 0, error: "Voucher belum bisa digunakan" }
    if (voucher.endDate && now > voucher.endDate) return { valid: false, discount: 0, error: "Voucher sudah kadaluarsa" }

    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
        return { valid: false, discount: 0, error: "Kuota voucher telah habis" }
    }

    // 1. User Usage Limit
    if (voucher.userUsageLimit) {
        const userUsage = await prisma.userVoucher.count({
            where: {
                voucherId: voucher.id,
                userId: userId,
                isUsed: true
            }
        })
        if (userUsage >= voucher.userUsageLimit) {
            return { valid: false, discount: 0, error: "Kamu sudah menggunakan voucher ini sebelumnya" }
        }
    }

    // 2. Min Order
    if (voucher.minOrder && subtotal < Number(voucher.minOrder)) {
        return { valid: false, discount: 0, error: `Minimal belanja Rp ${Number(voucher.minOrder).toLocaleString('id-ID')} diperlukan` }
    }

    // 3. Order Type
    if (voucher.validOrderTypes) {
        const validTypes = (voucher.validOrderTypes as string[]).map(t => t.toUpperCase().replace('_', ''));
        const checkType = orderType.toUpperCase().replace('_', ''); // normalize dine_in -> DINEIN

        // Also handle standard display formats if needed (e.g. DINE_IN vs DINEIN)
        if (!validTypes.includes(checkType) && !validTypes.includes(orderType.toUpperCase())) {
            return { valid: false, discount: 0, error: `Voucher hanya berlaku untuk pesanan: ${validTypes.join(", ")}` }
        }
    }

    // 4. Product/Category Scope
    // Logic: If scoped, at least one item must match? Or discount only applies to matching items?
    // Common behavior: Voucher applies to TOTAL if eligible items exist, OR discount applies only to eligible items.
    // Let's implement: Discount applies to TOTAL (simple) but requires at least 1 eligible item if scoped.

    const validProductIds = voucher.validProductIds as string[] | null
    const validCategoryIds = voucher.validCategoryIds as string[] | null

    if (validProductIds?.length || validCategoryIds?.length) {
        const hasEligibleItem = cartItems.some(item => {
            if (validProductIds?.length && validProductIds.includes(item.productId)) return true
            if (validCategoryIds?.length && validCategoryIds.includes(item.categoryId)) return true
            return false
        })
        if (!hasEligibleItem) {
            return { valid: false, discount: 0, error: "Keranjang tidak berisi produk yang sesuai dengan voucher ini" }
        }
    }

    // 5. Customer Eligibility
    if (voucher.customerEligibility === "NEW_USER") {
        const previousOrders = await prisma.order.count({ where: { userId } })
        if (previousOrders > 0) {
            return { valid: false, discount: 0, error: "Voucher hanya untuk pengguna baru" }
        }
    } else if (voucher.customerEligibility === "SPECIFIC_USER") {
        const eligibleIds = voucher.eligibleUserIds as string[] || []
        if (!eligibleIds.includes(userId)) {
            return { valid: false, discount: 0, error: "Kamu tidak memenuhi syarat untuk voucher ini" }
        }
    }
    // TODO: Tier check if needed

    // Calculate Discount
    let discount = 0
    const type = voucher.discountType.toUpperCase()

    if (type === "FIXED") {
        discount = Number(voucher.discountValue)
    } else if (type === "PERCENT" || type === "PERCENTAGE") {
        discount = subtotal * (Number(voucher.discountValue) / 100)
        if (voucher.maxDiscount) {
            discount = Math.min(discount, Number(voucher.maxDiscount))
        }
    } else {
        // Default fallback if unknown type, assuming fixed or log error
        discount = Number(voucher.discountValue)
    }

    // Ensure discount doesn't exceed subtotal
    discount = Math.min(discount, subtotal)

    return { valid: true, discount, error: undefined }
}
