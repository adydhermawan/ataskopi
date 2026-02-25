
import { NextResponse } from "next/server"
import { validateVoucher } from "@/lib/services/voucher-service"


export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { code, userId, subtotal, orderType, cartItems } = body

        if (!code) {
            return NextResponse.json({ valid: false, error: "Voucher code required" }, { status: 400 })
        }

        // Optional: Require auth? Not strictly needed for checking validity, but userId is needed for limits
        // If userId is provided in body, use it.

        const result = await validateVoucher(code, userId, subtotal, orderType, cartItems || [])

        return NextResponse.json(result)

    } catch (error) {
        console.error("Voucher check error:", error)
        return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 })
    }
}
