import { ServiceError } from '@/lib/services/service-error';

export const TAX_RATE = 0.11;

export function calculateTax(subtotal: number, taxEnabled: boolean): number {
    return taxEnabled ? subtotal * TAX_RATE : 0;
}

interface PricedProduct {
    basePrice: unknown;
    options: { id: string; values: { id: string; priceModifier: unknown }[] }[];
    modifiers: { id: string; price: unknown; isAvailable: boolean }[];
    channelPrices?: { channel: string; price: unknown }[];
}

interface PricedItem {
    selectedOptions?: { optionId: string; valueId: string }[];
    selectedModifiers?: { modifierId: string; quantity: number }[];
}

interface PricingOptions {
    channel?: string;
    // A sale made offline must still sync after a modifier is switched off.
    allowUnavailableModifiers?: boolean;
}

/**
 * Calculates the price of one unit including its options and modifiers.
 */
export function priceOrderItem(product: PricedProduct, item: PricedItem, pricing: PricingOptions = {}) {
    const channelPrice = product.channelPrices?.find((p) => p.channel === pricing.channel);
    let unitPrice = Number(channelPrice?.price ?? product.basePrice);

    for (const selectedOption of item.selectedOptions ?? []) {
        const option = product.options.find((o) => o.id === selectedOption.optionId);
        if (!option) {
            throw new ServiceError(`Invalid option ${selectedOption.optionId}`);
        }

        const value = option.values.find((v) => v.id === selectedOption.valueId);
        if (!value) {
            throw new ServiceError(`Invalid option value ${selectedOption.valueId}`);
        }

        unitPrice += Number(value.priceModifier);
    }

    const modifiers: { modifierId: string; quantity: number; unitPrice: number }[] = [];
    for (const selectedModifier of item.selectedModifiers ?? []) {
        const modifier = product.modifiers.find((m) => m.id === selectedModifier.modifierId);
        if (!modifier || (!modifier.isAvailable && !pricing.allowUnavailableModifiers)) {
            throw new ServiceError(`Invalid or unavailable modifier ${selectedModifier.modifierId}`);
        }

        unitPrice += Number(modifier.price) * selectedModifier.quantity;
        modifiers.push({
            modifierId: modifier.id,
            quantity: selectedModifier.quantity,
            unitPrice: Number(modifier.price),
        });
    }

    return { unitPrice, modifiers };
}
