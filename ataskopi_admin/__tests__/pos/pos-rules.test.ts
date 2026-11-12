/**
 * @jest-environment node
 */
import { expandStatusAliases } from '@/lib/order-status';
import { calculateTax, priceOrderItem } from '@/lib/services/order-pricing';
import { assertPaymentAllowsStatus } from '@/lib/services/order-status-service';
import { isStandardChoice } from '@/lib/services/pos-catalog-service';
import { assertOutletAcceptsOnlineOrders, POS_OFFLINE_LIMIT_MS } from '@/lib/services/pos-outlet';
import { assertOrderTotals, collectedAmount, summarizePayments } from '@/lib/services/pos-order-service';
import { calculateExpectedCash } from '@/lib/services/pos-shift-service';
import { posOrderSchema } from '@/lib/validation/pos-schemas';

const product = {
    basePrice: 20000,
    options: [{ id: 'size', values: [{ id: 'large', priceModifier: 5000 }] }],
    modifiers: [
        { id: 'shot', price: 4000, isAvailable: true },
        { id: 'oat', price: 6000, isAvailable: false },
    ],
    channelPrices: [{ channel: 'grab', price: 26000 }],
};

function order(overrides = {}) {
    return posOrderSchema.parse({
        clientOrderId: 'client-order-1',
        orderType: 'pickup',
        queueNumber: 'A-001',
        shiftId: 'shift-1',
        createdAt: '2026-11-07T03:00:00.000Z',
        items: [{ productId: 'p1', quantity: 2, unitPrice: 22000 }],
        subtotal: 44000,
        total: 44000,
        ...overrides,
    });
}

describe('priceOrderItem', () => {
    it('adds options and modifiers to the base price', () => {
        const priced = priceOrderItem(product, {
            selectedOptions: [{ optionId: 'size', valueId: 'large' }],
            selectedModifiers: [{ modifierId: 'shot', quantity: 2 }],
        });
        expect(priced.unitPrice).toBe(33000);
        expect(priced.modifiers).toEqual([{ modifierId: 'shot', quantity: 2, unitPrice: 4000 }]);
    });

    it('uses the channel price and falls back to the base price', () => {
        expect(priceOrderItem(product, {}, { channel: 'grab' }).unitPrice).toBe(26000);
        expect(priceOrderItem(product, {}, { channel: 'shopeefood' }).unitPrice).toBe(20000);
    });

    it('rejects an unavailable modifier unless the sale already happened', () => {
        const item = { selectedModifiers: [{ modifierId: 'oat', quantity: 1 }] };
        expect(() => priceOrderItem(product, item)).toThrow('Invalid or unavailable modifier');
        expect(priceOrderItem(product, item, { allowUnavailableModifiers: true }).unitPrice).toBe(26000);
    });

    it('rejects an unknown option value', () => {
        const item = { selectedOptions: [{ optionId: 'size', valueId: 'nope' }] };
        expect(() => priceOrderItem(product, item)).toThrow('Invalid option value');
    });
});

describe('calculateTax', () => {
    it('follows the tax setting', () => {
        expect(calculateTax(100000, true)).toBeCloseTo(11000);
        expect(calculateTax(100000, false)).toBe(0);
    });
});

describe('expandStatusAliases', () => {
    it('matches both delivery names', () => {
        expect(expandStatusAliases(['on_the_way'])).toEqual(['on_the_way', 'on_delivery']);
        expect(expandStatusAliases(['ready'])).toEqual(['ready']);
    });
});

describe('assertPaymentAllowsStatus', () => {
    const unpaid = { paymentStatus: 'pending', paymentMethod: null };

    it('blocks an unpaid online QRIS order from the bar', () => {
        expect(() =>
            assertPaymentAllowsStatus({ ...unpaid, paymentMethod: 'qris', source: 'customer_app' }, 'preparing')
        ).toThrow('must be PAID');
    });

    it('lets an unpaid cashier order start but not finish', () => {
        const posOrder = { ...unpaid, source: 'pos' };
        expect(() => assertPaymentAllowsStatus(posOrder, 'preparing')).not.toThrow();
        expect(() => assertPaymentAllowsStatus(posOrder, 'completed')).toThrow('PAID');
    });

    it('lets the cashier app start an unpaid online QRIS order but not finish it', () => {
        const online = { ...unpaid, paymentMethod: 'qris', source: 'customer_app' };
        expect(() => assertPaymentAllowsStatus(online, 'preparing', true)).not.toThrow();
        expect(() => assertPaymentAllowsStatus(online, 'ready', true)).not.toThrow();
        expect(() => assertPaymentAllowsStatus(online, 'completed', true)).toThrow('belum lunas');
        expect(() =>
            assertPaymentAllowsStatus({ ...online, paymentStatus: 'paid' }, 'completed', true)
        ).not.toThrow();
    });
});

describe('isStandardChoice', () => {
    const option = (minSelect: number, values: { id: string; isDefault: boolean }[]) => ({ minSelect, values });

    it('treats the marked default as standard', () => {
        const values = [{ id: 'hot', isDefault: false }, { id: 'ice', isDefault: true }];
        expect(isStandardChoice({ id: 'ice', option: option(1, values) })).toBe(true);
        expect(isStandardChoice({ id: 'hot', option: option(1, values) })).toBe(false);
    });

    it('falls back to the first value of a required option, like the cashier app', () => {
        const values = [{ id: 'regular', isDefault: false }, { id: 'large', isDefault: false }];
        expect(isStandardChoice({ id: 'regular', option: option(1, values) })).toBe(true);
        expect(isStandardChoice({ id: 'regular', option: option(0, values) })).toBe(false);
    });
});

describe('assertOutletAcceptsOnlineOrders', () => {
    const now = new Date('2026-11-07T03:00:00.000Z');
    const open = { onlineOrdersPaused: false, posAutoPauseEnabled: false, posLastSeenAt: null };

    it('accepts orders by default so outlets without a POS keep working', () => {
        expect(() => assertOutletAcceptsOnlineOrders(open, now)).not.toThrow();
    });

    it('refuses when paused', () => {
        expect(() => assertOutletAcceptsOnlineOrders({ ...open, onlineOrdersPaused: true }, now)).toThrow();
    });

    it('refuses when auto pause is on and the POS has gone quiet', () => {
        const auto = { ...open, posAutoPauseEnabled: true };
        const seenAt = (ms: number) => new Date(now.getTime() - ms);

        expect(() => assertOutletAcceptsOnlineOrders(auto, now)).toThrow();
        expect(() =>
            assertOutletAcceptsOnlineOrders({ ...auto, posLastSeenAt: seenAt(POS_OFFLINE_LIMIT_MS + 1) }, now)
        ).toThrow();
        expect(() =>
            assertOutletAcceptsOnlineOrders({ ...auto, posLastSeenAt: seenAt(1000) }, now)
        ).not.toThrow();
    });
});

describe('assertOrderTotals', () => {
    it('accepts consistent totals with discount and tax', () => {
        expect(() =>
            assertOrderTotals(order({ discount: 4000, tax: 1000, total: 41000 }))
        ).not.toThrow();
    });

    it('rejects a subtotal that does not match the items', () => {
        expect(() => assertOrderTotals(order({ subtotal: 40000, total: 40000 }))).toThrow('Subtotal');
    });

    it('rejects a total that does not add up', () => {
        expect(() => assertOrderTotals(order({ total: 1000 }))).toThrow('Total');
    });
});

describe('summarizePayments', () => {
    it('stays pending until fully paid', () => {
        expect(summarizePayments(50000, [], 0)).toEqual({ paymentStatus: 'pending', paymentMethod: null });
        expect(summarizePayments(50000, [{ method: 'cash', amount: 20000 }], 0).paymentStatus).toBe('pending');
    });

    it('marks a mixed payment as split', () => {
        const payments = [
            { method: 'cash', amount: 20000 },
            { method: 'qris', amount: 30000 },
        ];
        expect(summarizePayments(50000, payments, 0)).toEqual({ paymentStatus: 'paid', paymentMethod: 'split' });
    });

    it('stays paid after a partial refund and flips after a full one', () => {
        const payments = [{ method: 'cash', amount: 50000 }];
        expect(summarizePayments(50000, payments, 10000).paymentStatus).toBe('paid');
        expect(summarizePayments(50000, payments, 50000).paymentStatus).toBe('refunded');
    });
});

describe('collectedAmount', () => {
    it('trusts the web board flag when there are no payment rows', () => {
        expect(collectedAmount({ paymentStatus: 'paid', total: 30000, payments: [] })).toBe(30000);
        expect(collectedAmount({ paymentStatus: 'pending', total: 30000, payments: [] })).toBe(0);
    });
});

describe('calculateExpectedCash', () => {
    it('counts only cash in and out of the drawer', () => {
        const expected = calculateExpectedCash(
            200000,
            [
                { method: 'cash', amount: 50000 },
                { method: 'qris', amount: 70000 },
                { method: 'grab', amount: 30000 },
            ],
            [
                { method: 'cash', amount: 10000 },
                { method: 'qris', amount: 5000 },
            ],
            [
                { type: 'in', amount: 20000 },
                { type: 'out', amount: 15000 },
            ]
        );
        expect(expected).toBe(245000);
    });
});
