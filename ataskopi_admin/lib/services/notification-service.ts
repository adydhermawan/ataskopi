import { db } from '@/lib/db';

/**
 * Notification Service
 * Centralized helper for creating system-triggered notifications
 */

export type NotificationCategory = 'transaction' | 'promo' | 'loyalty' | 'info';

interface CreateNotificationParams {
    userId: string;
    category: NotificationCategory;
    title: string;
    message: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
    try {
        const notification = await db.notification.create({
            data: {
                userId: params.userId,
                category: params.category,
                title: params.title,
                message: params.message,
                isRead: false,
            },
        });
        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
        return null;
    }
}

/**
 * Create multiple notifications for batch operations
 */
export async function createNotificationBatch(notifications: CreateNotificationParams[]) {
    try {
        const result = await db.notification.createMany({
            data: notifications.map(n => ({
                userId: n.userId,
                category: n.category,
                title: n.title,
                message: n.message,
                isRead: false,
            })),
        });
        return result.count;
    } catch (error) {
        console.error('Failed to create notification batch:', error);
        return 0;
    }
}

// ============================================
// ORDER NOTIFICATION TEMPLATES
// ============================================

export async function notifyOrderCreated(userId: string, orderNumber: string) {
    return createNotification({
        userId,
        category: 'transaction',
        title: 'Pesanan Dibuat',
        message: `Pesanan #${orderNumber} sedang diproses. Mohon tunggu konfirmasi dari outlet.`,
    });
}

export async function notifyOrderPreparing(userId: string, orderNumber: string) {
    return createNotification({
        userId,
        category: 'transaction',
        title: 'Pesanan Sedang Dibuat',
        message: `Pesanan #${orderNumber} sedang disiapkan. Tunggu sebentar ya!`,
    });
}

export async function notifyOrderReady(userId: string, orderNumber: string) {
    return createNotification({
        userId,
        category: 'transaction',
        title: 'Pesanan Siap!',
        message: `Pesanan #${orderNumber} sudah siap diambil. Silakan ambil di counter pickup.`,
    });
}

export async function notifyOrderOnDelivery(userId: string, orderNumber: string) {
    return createNotification({
        userId,
        category: 'transaction',
        title: 'Pesanan Dalam Perjalanan',
        message: `Pesanan #${orderNumber} sedang diantar ke lokasi kamu.`,
    });
}

export async function notifyOrderCompleted(userId: string, orderNumber: string) {
    return createNotification({
        userId,
        category: 'transaction',
        title: 'Pesanan Selesai',
        message: `Terima kasih! Pesanan #${orderNumber} telah selesai. Jangan lupa beri review ya!`,
    });
}

export async function notifyOrderCancelled(userId: string, orderNumber: string) {
    return createNotification({
        userId,
        category: 'transaction',
        title: 'Pesanan Dibatalkan',
        message: `Pesanan #${orderNumber} telah dibatalkan. Hubungi outlet untuk info lebih lanjut.`,
    });
}

// ============================================
// LOYALTY NOTIFICATION TEMPLATES
// ============================================

export async function notifyPointsEarned(userId: string, points: number, orderNumber: string) {
    return createNotification({
        userId,
        category: 'loyalty',
        title: `+${points} Poin!`,
        message: `Kamu mendapat ${points} poin dari pesanan #${orderNumber}. Terus kumpulkan poin untuk reward menarik!`,
    });
}

export async function notifyTierUpgrade(userId: string, newTierName: string) {
    return createNotification({
        userId,
        category: 'loyalty',
        title: 'Selamat! Tier Naik!',
        message: `Kamu naik ke tier ${newTierName}! Nikmati benefit eksklusif yang lebih banyak.`,
    });
}

// ============================================
// INFO NOTIFICATION TEMPLATES
// ============================================

export async function notifyProfileUpdated(userId: string) {
    return createNotification({
        userId,
        category: 'info',
        title: 'Profil Diperbarui',
        message: 'Data profilmu berhasil diperbarui.',
    });
}
