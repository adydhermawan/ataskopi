export type UserRole = 'admin' | 'owner' | 'kasir' | 'customer';

export interface Permissions {
    view: UserRole[];
    create?: UserRole[];
    update?: UserRole[];
    delete?: UserRole[];
}

export const PERMISSIONS: Record<string, Permissions> = {
    dashboard: {
        view: ['admin', 'owner', 'kasir'],
    },
    products: {
        view: ['admin', 'owner'],
        create: ['admin', 'owner'],
        update: ['admin', 'owner'],
        delete: ['admin', 'owner'],
    },
    categories: {
        view: ['admin', 'owner'],
        create: ['admin', 'owner'],
        update: ['admin', 'owner'],
        delete: ['admin', 'owner'],
    },
    outlets: {
        view: ['admin', 'owner'],
        create: ['admin', 'owner'],
        update: ['admin', 'owner'],
        delete: ['admin', 'owner'],
    },
    orders: {
        view: ['admin', 'owner', 'kasir'],
        create: ['admin', 'kasir'],
        update: ['admin', 'kasir'],
        delete: ['admin'],
    },
    customers: {
        view: ['admin', 'owner'],
        create: ['admin', 'owner'],
        update: ['admin', 'owner'],
        delete: ['admin'],
    },
    settings: {
        view: ['admin', 'owner', 'kasir'],
        update: ['admin', 'owner'],
    },
    users: {
        view: ['admin', 'owner'],
        create: ['admin', 'owner'],
        update: ['admin', 'owner'],
        delete: ['admin'],
    },
};

/**
 * Check if a role is allowed to perform an action on a resource
 */
export function isAllowed(role: string, resource: string, action: keyof Permissions = 'view'): boolean {
    const userRole = role as UserRole;

    // Admin has superuser access
    if (userRole === 'admin') return true;

    const resourcePermissions = PERMISSIONS[resource];
    if (!resourcePermissions) return false;

    const allowedRoles = resourcePermissions[action];
    if (!allowedRoles) return false;

    return (allowedRoles as UserRole[]).includes(userRole);
}
