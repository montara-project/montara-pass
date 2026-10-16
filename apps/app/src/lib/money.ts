/**
 * A price from its amount in cents, which the API counts every currency in,
 * as Lemon Squeezy does.
 */
export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currencyDisplay: 'narrowSymbol',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100)
}
