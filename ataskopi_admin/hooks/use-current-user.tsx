"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { isAllowed, Permissions } from '@/lib/permissions'

interface User {
    id: string
    name: string
    email?: string
    phone: string
    role: string
}

interface UserContextType {
    user: User | null
    loading: boolean
}

const UserContext = createContext<UserContextType>({
    user: null,
    loading: true
})

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Fetch current user from API
        fetch('/api/me')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data) {
                    const userData = data.data;
                    setUser({
                        id: userData.id,
                        name: userData.name,
                        email: userData.email,
                        phone: userData.phone,
                        role: userData.role
                    })
                }
            })
            .catch(err => console.error('Failed to fetch user:', err))
            .finally(() => setLoading(false))
    }, [])

    return (
        <UserContext.Provider value={{ user, loading }}>
            {children}
        </UserContext.Provider>
    )
}

export function useCurrentUser() {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('useCurrentUser must be used within UserProvider')
    }
    return context
}

/**
 * Check if current user has required role
 */
export function useHasRole(allowedRoles: string[]) {
    const { user } = useCurrentUser()
    if (!user) return false
    return allowedRoles.includes(user.role)
}

/**
 * Check if current user can perform action on resource
 */
export function useCanPerform(action: keyof Permissions, resource: string) {
    const { user } = useCurrentUser()

    if (!user) return false
    return isAllowed(user.role, resource, action)
}
