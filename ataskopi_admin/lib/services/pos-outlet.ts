import { ServiceError } from '@/lib/services/service-error';

export const POS_OFFLINE_LIMIT_MS = 5 * 60 * 1000;

interface OutletOnlineState {
    onlineOrdersPaused: boolean;
    posAutoPauseEnabled: boolean;
    posLastSeenAt: Date | null;
}

/**
 * Stops customers from ordering when nobody at the outlet can see the order.
 */
export function assertOutletAcceptsOnlineOrders(outlet: OutletOnlineState, now: Date = new Date()) {
    if (outlet.onlineOrdersPaused) {
        throw new ServiceError('Outlet sedang tidak menerima pesanan online');
    }

    if (outlet.posAutoPauseEnabled) {
        const lastSeen = outlet.posLastSeenAt?.getTime() ?? 0;
        if (now.getTime() - lastSeen > POS_OFFLINE_LIMIT_MS) {
            throw new ServiceError('Outlet sedang tidak menerima pesanan online');
        }
    }
}
