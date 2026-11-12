export const ACTIVE_ORDER_STATUSES = [
    'pending',
    'preparing',
    'ready',
    'waiting_pickup',
    'on_delivery',
    'on_the_way',
];

/**
 * The dashboard writes on_delivery while the customer app asks for on_the_way,
 * so a filter for either one has to match both.
 */
export function expandStatusAliases(statuses: string[]): string[] {
    const expanded = new Set(statuses);
    if (expanded.has('on_the_way')) expanded.add('on_delivery');
    if (expanded.has('on_delivery')) expanded.add('on_the_way');
    return [...expanded];
}
