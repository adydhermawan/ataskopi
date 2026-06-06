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

        // 1. Ensure all summaries exist in DB (self-healing mechanism)
        try {
            await this.ensureDailySummaries(startDate, endDate, outletId);
        } catch (error) {
            console.error("Failed to ensure daily summaries:", error);
        }

        // 2. Force sync today's summary to keep it completely real-time
        try {
            let outletsToSync: string[] = [];
            if (outletId) {
                outletsToSync = [outletId];
            } else {
                const activeOutlets = await db.outlet.findMany({
                    where: { isActive: true },
                    select: { id: true }
                });
                outletsToSync = activeOutlets.map(o => o.id);
            }
            for (const oid of outletsToSync) {
                await this.syncDailySummary(new Date(), oid);
            }
        } catch (error) {
            console.error("Failed to sync today's summary:", error);
        }

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
     * Helper to ensure DailySalesSummary records exist for all outlets in a period
     */
    static async ensureDailySummaries(startDate: Date, endDate: Date, outletId: string | null) {
        // Get outlets to sync
        let outlets: string[] = [];
        if (outletId) {
            outlets = [outletId];
        } else {
            const activeOutlets = await db.outlet.findMany({
                where: { isActive: true },
                select: { id: true }
            });
            outlets = activeOutlets.map(o => o.id);
        }

        // Loop over dates from startDate to endDate (inclusive)
        const start = startOfDay(startDate);
        const end = endOfDay(endDate);
        const daysDiff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        for (let i = 0; i < daysDiff; i++) {
            const currentDate = subDays(end, i);
            const dateKey = new Date(format(currentDate, "yyyy-MM-dd") + "T00:00:00Z");

            for (const oid of outlets) {
                // Check if summary already exists
                const existing = await db.dailySalesSummary.findUnique({
                    where: {
                        date_outletId: {
                            date: dateKey,
                            outletId: oid
                        }
                    }
                });

                if (!existing) {
                    await this.syncDailySummary(currentDate, oid);
                }
            }
        }
    }

    /**
     * Gets today's manually logged real revenue
     */
    static async getTodayRealRevenue(outletId: string | null) {
        const now = new Date();
        const dateKey = new Date(format(now, "yyyy-MM-dd") + "T00:00:00Z");

        const records = await db.dailyRealRevenue.findMany({
            where: {
                ...(outletId ? { outletId } : {}),
                date: dateKey
            }
        });

        const totalAmount = records.reduce((sum, r) => sum.add(r.amount), new Prisma.Decimal(0));
        return totalAmount.toNumber();
    }

    /**
     * Gets manually logged real revenue for a period
     */
    static async getPeriodRealRevenue(outletId: string | null, days: number = 7) {
        const endDate = endOfDay(new Date());
        const startDate = startOfDay(subDays(new Date(), days - 1));

        const records = await db.dailyRealRevenue.findMany({
            where: {
                ...(outletId ? { outletId } : {}),
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: {
                date: "asc"
            }
        });

        return records.map(r => ({
            id: r.id,
            date: r.date,
            outletId: r.outletId,
            amount: r.amount.toNumber(),
            notes: r.notes,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt
        }));
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

    /**
     * Gets summary for a specific date range
     */
    static async getPeriodSummaryByDateRange(outletId: string | null, startDate: Date, endDate: Date) {
        const start = startOfDay(startDate);
        const end = endOfDay(endDate);

        try {
            await this.ensureDailySummaries(start, end, outletId);
        } catch (error) {
            console.error("Failed to ensure daily summaries:", error);
        }

        const now = new Date();
        if (now >= start && now <= end) {
            try {
                let outletsToSync: string[] = [];
                if (outletId) {
                    outletsToSync = [outletId];
                } else {
                    const activeOutlets = await db.outlet.findMany({
                        where: { isActive: true },
                        select: { id: true }
                    });
                    outletsToSync = activeOutlets.map(o => o.id);
                }
                for (const oid of outletsToSync) {
                    await this.syncDailySummary(now, oid);
                }
            } catch (error) {
                console.error("Failed to sync today's summary:", error);
            }
        }

        const summaries = await db.dailySalesSummary.findMany({
            where: {
                ...(outletId ? { outletId } : {}),
                date: {
                    gte: start,
                    lte: end,
                },
            },
            orderBy: {
                date: "asc",
            },
        });

        return summaries;
    }

    /**
     * Gets manually logged real revenue for a date range
     */
    static async getPeriodRealRevenueByDateRange(outletId: string | null, startDate: Date, endDate: Date) {
        const start = startOfDay(startDate);
        const end = endOfDay(endDate);

        const records = await db.dailyRealRevenue.findMany({
            where: {
                ...(outletId ? { outletId } : {}),
                date: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: {
                date: "asc"
            }
        });

        return records.map(r => ({
            id: r.id,
            date: r.date,
            outletId: r.outletId,
            amount: r.amount.toNumber(),
            notes: r.notes,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt
        }));
    }

    /**
     * Get aggregated KPI summary for a period
     */
    static async getAggregatedSummary(outletId: string | null, startDate: Date, endDate: Date) {
        const summaries = await this.getPeriodSummaryByDateRange(outletId, startDate, endDate);
        const realRevenues = await this.getPeriodRealRevenueByDateRange(outletId, startDate, endDate);
        
        const totalRevenue = summaries.reduce((acc, curr) => acc + Number(curr.totalRevenue), 0);
        const totalOrders = summaries.reduce((acc, curr) => acc + curr.totalOrders, 0);
        const totalItems = summaries.reduce((acc, curr) => acc + curr.totalItems, 0);
        const totalRealRevenue = realRevenues.reduce((acc, curr) => acc + curr.amount, 0);
        
        return {
            totalRevenue,
            totalOrders,
            totalItems,
            averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            totalRealRevenue
        };
    }

    /**
     * Get aggregated KPI summary for the previous comparison period
     */
    static async getComparisonSummary(outletId: string | null, currentStartDate: Date, currentEndDate: Date) {
        const start = startOfDay(currentStartDate);
        const end = endOfDay(currentEndDate);
        
        const durationMs = end.getTime() - start.getTime();
        const daysDiff = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)));
        
        const prevEndDate = endOfDay(subDays(start, 1));
        const prevStartDate = startOfDay(subDays(prevEndDate, daysDiff - 1));
        
        return this.getAggregatedSummary(outletId, prevStartDate, prevEndDate);
    }
}
