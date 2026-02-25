import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export class DashboardService {
    /**
     * Aggregates and saves sales data for a specific date and outlet.
     */
    static async syncDailySummary(date: Date, outletId: String) {
        const start = startOfDay(date);
        const end = endOfDay(date);

        // This ensures the date stored in DB is always the intended date at UTC midnight
        // preventing local timezone shifts (e.g. UTC+7 shifting 00:00 to 17:00 previous day UTC)
        const dateKey = new Date(format(date, "yyyy-MM-dd") + "T00:00:00Z");

        // 1. Fetch all completed orders for this day and outlet
        const orders = await db.order.findMany({
            where: {
                outletId: outletId as string,
                createdAt: {
                    gte: start,
                    lte: end,
                },
                orderStatus: "completed",
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (orders.length === 0) {
            // Upsert empty summary if no orders
            return await db.dailySalesSummary.upsert({
                where: {
                    date_outletId: {
                        date: dateKey,
                        outletId: outletId as string,
                    },
                },
                create: {
                    date: dateKey,
                    outletId: outletId as string,
                    totalRevenue: 0,
                    totalOrders: 0,
                    totalItems: 0,
                    averageTicket: 0,
                    topProducts: [],
                    paymentMix: {},
                },
                update: {
                    totalRevenue: 0,
                    totalOrders: 0,
                    totalItems: 0,
                    averageTicket: 0,
                    topProducts: [],
                    paymentMix: {},
                },
            });
        }

        // 2. Calculate Aggregates
        let totalRevenue = new Prisma.Decimal(0);
        let totalItems = 0;
        const productStats: Record<string, { name: string; qty: number; revenue: Prisma.Decimal }> = {};
        const paymentStats: Record<string, number> = {};

        orders.forEach((order) => {
            totalRevenue = totalRevenue.add(order.total);

            const method = order.paymentMethod || "UNKNOWN";
            paymentStats[method] = (paymentStats[method] || 0) + 1;

            order.items.forEach((item) => {
                totalItems += item.quantity;

                if (!productStats[item.productId]) {
                    productStats[item.productId] = {
                        name: item.product.name,
                        qty: 0,
                        revenue: new Prisma.Decimal(0),
                    };
                }
                productStats[item.productId].qty += item.quantity;
                productStats[item.productId].revenue = productStats[item.productId].revenue.add(
                    new Prisma.Decimal(item.unitPrice).mul(item.quantity)
                );
            });
        });

        const averageTicket = totalRevenue.div(orders.length);

        // 3. Format Top Products
        const topProducts = Object.values(productStats)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 10)
            .map(p => ({
                name: p.name,
                qty: p.qty,
                revenue: p.revenue.toNumber()
            }));

        // 4. Save to Summary Table
        return await db.dailySalesSummary.upsert({
            where: {
                date_outletId: {
                    date: dateKey,
                    outletId: outletId as string,
                },
            },
            create: {
                date: dateKey,
                outletId: outletId as string,
                totalRevenue,
                totalOrders: orders.length,
                totalItems,
                averageTicket,
                topProducts: topProducts as any,
                paymentMix: paymentStats as any,
            },
            update: {
                totalRevenue,
                totalOrders: orders.length,
                totalItems,
                averageTicket,
                topProducts: topProducts as any,
                paymentMix: paymentStats as any,
            },
        });
    }

    /**
     * Gets summary for a specific period
     */
    static async getPeriodSummary(outletId: string | null, days: number = 7) {
        const endDate = endOfDay(new Date());
        const startDate = startOfDay(subDays(new Date(), days - 1));

        const summaries = await db.dailySalesSummary.findMany({
            where: {
                ...(outletId ? { outletId } : {}),
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: {
                date: "asc",
            },
        });

        return summaries;
    }

    /**
     * Gets today's real-time summary
     */
    static async getTodayRealtime(outletId: string | null) {
        const now = new Date();
        const start = startOfDay(now);
        const end = endOfDay(now);

        const orders = await db.order.findMany({
            where: {
                ...(outletId ? { outletId } : {}),
                createdAt: {
                    gte: start,
                    lte: end,
                },
                orderStatus: "completed",
            },
            select: {
                total: true,
                items: {
                    select: {
                        quantity: true
                    }
                }
            }
        });

        const totalRevenue = orders.reduce((sum, o) => sum.add(o.total), new Prisma.Decimal(0));
        const totalOrders = orders.length;
        const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((isum, i) => isum + i.quantity, 0), 0);

        return {
            totalRevenue: totalRevenue.toNumber(),
            totalOrders,
            totalItems,
            averageTicket: totalOrders > 0 ? totalRevenue.div(totalOrders).toNumber() : 0
        };
    }
}
