import type { Prisma } from '@prisma/client';
import { db as prisma } from '@/lib/db';
import { endOfDay, startOfDay } from 'date-fns';

type Client = Prisma.TransactionClient | typeof prisma;

/** The outlet runs on WIB; a shift belongs to the day it was opened. */
const BUSINESS_TIME_ZONE = 'Asia/Jakarta';
const BUSINESS_UTC_OFFSET = '+07:00';
const DAY_MS = 24 * 60 * 60 * 1000;

const PLATFORM_LABELS: Record<string, string> = {
    shopeefood: 'ShopeeFood',
    grab: 'Grab',
};

/** `yyyy-MM-dd` of [at] in WIB. */
export function businessDate(at: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: BUSINESS_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(at);
}

export function businessDayRange(date: string) {
    const start = new Date(`${date}T00:00:00${BUSINESS_UTC_OFFSET}`);
    return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** Purchases and expenses paid in cash from the outlet's own takings. */
export function paidInCashOn(outletId: string, date: string) {
    const dateKey = new Date(`${date}T00:00:00Z`);
    return {
        outletId,
        paymentMethod: 'CASH',
        paymentStatus: 'PAID',
        AND: [
            { OR: [{ paymentSource: { in: ['Cash', 'CASH', ''] } }, { paymentSource: null }] },
            { OR: [{ omzetDate: dateKey }, { omzetDate: null, date: dateKey }] },
        ],
    };
}

/** Raw material bought with cash on [date] (`yyyy-MM-dd`). */
export async function cashPurchasesForDate(outletId: string, date: string, client: Client = prisma) {
    const purchases = await client.inventoryPurchase.findMany({
        where: paidInCashOn(outletId, date),
        select: { totalAmount: true },
    });
    return purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
}

/** Operational expenses paid with cash on [date] (`yyyy-MM-dd`). */
export async function cashExpensesForDate(outletId: string, date: string, client: Client = prisma) {
    const expenses = await client.expense.findMany({
        where: paidInCashOn(outletId, date),
        select: { amount: true },
    });
    return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
}

/** The day's cash purchases, as the daily cash form lists them. */
export async function cashPurchasesListForDate(outletId: string, date: string, client: Client = prisma) {
    const purchases = await client.inventoryPurchase.findMany({
        where: paidInCashOn(outletId, date),
        include: { rawMaterial: { select: { name: true, unit: true } } },
        orderBy: { createdAt: 'desc' },
    });
    return purchases.map((p) => ({
        id: p.id,
        rawMaterialId: p.rawMaterialId,
        rawMaterialName: p.rawMaterial.name,
        unit: p.rawMaterial.unit,
        quantity: Number(p.quantity),
        unitPrice: Number(p.unitPrice),
        totalAmount: Number(p.totalAmount),
        supplier: p.supplier,
        notes: p.notes,
    }));
}

/** The day's cash expenses, as the daily cash form lists them. */
export async function cashExpensesListForDate(outletId: string, date: string, client: Client = prisma) {
    const expenses = await client.expense.findMany({
        where: paidInCashOn(outletId, date),
        orderBy: { createdAt: 'desc' },
    });
    return expenses.map((e) => ({
        id: e.id,
        category: e.category,
        amount: Number(e.amount),
        description: e.description,
    }));
}

/** Completed orders of the day, the "Omset Web (Sistem)" reference. */
export async function webRevenueForDate(outletId: string, date: Date, client: Client = prisma) {
    const orders = await client.order.findMany({
        where: {
            outletId,
            createdAt: { gte: startOfDay(date), lte: endOfDay(date) },
            orderStatus: 'completed',
        },
        select: { total: true },
    });
    return orders.reduce((sum, o) => sum + Number(o.total), 0);
}

export interface DailyCashSuggestion {
    cashAmount: number;
    qrisAmount: number;
    otherAmount: number;
    otherMethodName: string | null;
}

/**
 * What the day's form starts with. Cash bought raw material and paid expenses,
 * so both come off the cash takings; the admin adds them back for gross revenue.
 */
export function suggestDailyCash(
    salesByMethod: Record<string, number>,
    cashPurchases: number,
    cashExpenses: number
): DailyCashSuggestion {
    let otherAmount = 0;
    const otherNames: string[] = [];
    for (const [method, amount] of Object.entries(salesByMethod)) {
        if (method === 'cash' || method === 'qris' || amount <= 0) continue;
        otherAmount += amount;
        otherNames.push(PLATFORM_LABELS[method] ?? method);
    }

    return {
        cashAmount: Math.max(0, (salesByMethod.cash ?? 0) - cashPurchases - cashExpenses),
        qrisAmount: Math.max(0, salesByMethod.qris ?? 0),
        otherAmount,
        otherMethodName: otherNames.length > 0 ? otherNames.join(', ') : null,
    };
}

export interface DailyCashInput {
    cashAmount: number;
    qrisAmount: number;
    otherAmount?: number;
    otherMethodName?: string | null;
    notes?: string | null;
}

export type DailyCashResult = { saved: true; id: string } | { saved: false; error: string };

/**
 * Writes the day's record the same way the admin form does. A record the admin
 * has closed is left alone.
 */
export async function upsertDailyCash(
    client: Client,
    outletId: string,
    date: string,
    input: DailyCashInput
): Promise<DailyCashResult> {
    const dateKey = new Date(`${date}T00:00:00Z`);
    const existing = await client.dailyRealRevenue.findUnique({
        where: { date_outletId: { date: dateKey, outletId } },
        select: { isClosed: true },
    });
    if (existing?.isClosed) {
        return { saved: false, error: 'Catatan kas hari ini sudah ditutup admin, tidak diubah.' };
    }

    const [cashPurchases, cashExpenses, webRevenue] = await Promise.all([
        cashPurchasesForDate(outletId, date, client),
        cashExpensesForDate(outletId, date, client),
        webRevenueForDate(outletId, new Date(date), client),
    ]);

    const otherAmount = input.otherAmount ?? 0;
    const totalAmount = input.cashAmount + input.qrisAmount + otherAmount;
    const values = {
        cashAmount: input.cashAmount,
        qrisAmount: input.qrisAmount,
        otherAmount,
        otherMethodName: otherAmount > 0 ? input.otherMethodName || null : null,
        totalAmount,
        grossRevenue: totalAmount + cashPurchases + cashExpenses,
        cashPurchases,
        cashExpenses,
        webRevenue,
        notes: input.notes || null,
    };

    const record = await client.dailyRealRevenue.upsert({
        where: { date_outletId: { date: dateKey, outletId } },
        create: { date: dateKey, outletId, ...values },
        update: values,
        select: { id: true },
    });
    return { saved: true, id: record.id };
}
