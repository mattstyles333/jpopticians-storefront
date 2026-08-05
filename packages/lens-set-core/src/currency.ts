import type { LensConfig } from './types';

export function formatCurrency(amount: number, currency: LensConfig['currency']): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency.symbol}${amount.toFixed(2)}`;
  }
}

export function formatPriceAdjustment(amount: number, currency: LensConfig['currency']): string {
  if (amount === 0) return 'Included';
  return `+${formatCurrency(amount, currency)}`;
}
