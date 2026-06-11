/**
 * Simple in-memory cache with TTL support.
 * Used for stock projection data to avoid recalculating on every dashboard load.
 * Cache is invalidated when stock opname is completed or inventory purchase is made.
 */

interface CacheEntry<T> {
    data: T
    expiresAt: number
}

const cache = new Map<string, CacheEntry<any>>()

const DEFAULT_TTL_MS = 15 * 60 * 1000 // 15 minutes

export function cacheGet<T>(key: string): T | null {
    const entry = cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
        cache.delete(key)
        return null
    }
    return entry.data as T
}

export function cacheSet<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    cache.set(key, {
        data,
        expiresAt: Date.now() + ttlMs,
    })
}

export function cacheInvalidate(key: string): void {
    cache.delete(key)
}

export function cacheInvalidateByPrefix(prefix: string): void {
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
            cache.delete(key)
        }
    }
}

// Projection cache helpers
export const PROJECTION_CACHE_PREFIX = 'stock-projection:'

export function getProjectionCacheKey(outletId: string): string {
    return `${PROJECTION_CACHE_PREFIX}${outletId}`
}

export function invalidateProjectionCache(outletId: string): void {
    cacheInvalidate(getProjectionCacheKey(outletId))
}

export function invalidateAllProjectionCaches(): void {
    cacheInvalidateByPrefix(PROJECTION_CACHE_PREFIX)
}
