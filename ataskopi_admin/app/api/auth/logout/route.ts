import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'

export async function POST() {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
        }

        // Clear the auth cookie
        const response = NextResponse.json({
            success: true,
            message: 'Logged out successfully'
        })

        response.cookies.delete('auth_token')

        return response

    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 })
    }
}
