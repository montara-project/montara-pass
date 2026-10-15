/**
 * A price from its amount in the currency's minor unit. The API counts
 * rupiah whole (Midtrans charges no sen), other currencies in cents.
 */
export function formatPrice(amount: number, currency: string): string {
  const digits = currency === 'IDR' ? 0 : 2
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currencyDisplay: 'narrowSymbol',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount / 10 ** digits)
}
