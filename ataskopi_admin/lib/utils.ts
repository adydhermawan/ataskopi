import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parsePrismaDecimal(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    return val;
  }
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val === 'object') {
    if (typeof val.toNumber === 'function') {
      return val.toNumber();
    }
    if (typeof val.toJSON === 'function') {
      const parsed = parseFloat(val.toJSON());
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof val.toString === 'function') {
      const parsed = parseFloat(val.toString());
      return isNaN(parsed) ? 0 : parsed;
    }
    // Handle serialized decimal.js object (plain object from server action)
    if (val.d && Array.isArray(val.d) && typeof val.e === 'number' && typeof val.s === 'number') {
      try {
        const digits = val.d.join('');
        const num = val.s * parseFloat(digits) * Math.pow(10, val.e - val.d.length + 1);
        return isNaN(num) ? 0 : num;
      } catch (e) {
        return 0;
      }
    }
  }
  return 0;
}

