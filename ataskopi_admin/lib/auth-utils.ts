import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { isAllowed, Permissions } from './permissions'

export interface AuthUser {
    id: string
    phone: string
    name: string
    email?: string
    role: string
    outletId?: string | null
}

/**
 * Get current authenticated user from JWT token
 * Server-side only
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')?.value

        if (!token) {
            return null
        }

        const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long')
        const { payload } = await jwtVerify(token, secret)

        return {
            id: payload.sub as string,
            phone: payload.phone as string,
            name: payload.name as string,
            email: payload.email as string | undefined,
            role: payload.role as string,
            outletId: payload.outletId as string | undefined | null
        }
    } catch (error) {
        console.error('Failed to get current user:', error)
        return null
    }
}

/**
 * Check if user has one of the allowed roles
 */
export function hasRole(user: AuthUser | null, allowedRoles: string[]): boolean {
    if (!user) return false
    return allowedRoles.includes(user.role)
}

/**
 * Require specific roles for server actions
 * Throws error if user doesn't have required role
 */
export async function requireRole(allowedRoles: string[]) {
    const user = await getCurrentUser()

    if (!user) {
        throw new Error('Unauthorized: No user session')
    }

    if (!hasRole(user, allowedRoles)) {
        throw new Error(`Unauthorized: Required roles: ${allowedRoles.join(', ')}`)
    }

    return user
}

/**
 * Require specific permission for server actions
 */
export async function requirePermission(resource: string, action: keyof Permissions = 'view') {
    const user = await getCurrentUser()

    if (!user) {
        throw new Error('Unauthorized: No user session')
    }

    if (!isAllowed(user.role, resource, action)) {
        throw new Error(`Unauthorized: Missing permission ${action} on ${resource}`)
    }

    return user
}

/**
 * Check if user can perform action (for UI conditional rendering)
 */
export function canPerformAction(user: AuthUser | null, action: keyof Permissions, resource: string): boolean {
    if (!user) return false
    return isAllowed(user.role, resource, action)
}
