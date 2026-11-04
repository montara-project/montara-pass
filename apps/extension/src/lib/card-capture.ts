// Which fields of a form being sent hold a payment card, read from what each
// field says it takes. src/entrypoints/content.ts runs it in every page, so it
// imports nothing at runtime. The security code is never read: it is not
// kept from a page, only typed into the vault by hand.

import type { CardField } from '@montara-pass/shared/constants/vault'

import type { FieldInfo } from './contact-capture'

export type CapturedCard = Partial<Record<Exclude<CardField, 'code'>, string>>

type Slot = 'cardholder' | 'number' | 'expiry' | 'month' | 'year'

const AUTOCOMPLETE: Record<string, Slot> = {
  'cc-name': 'cardholder',
  'cc-number': 'number',
  'cc-exp': 'expiry',
  'cc-exp-month': 'month',
  'cc-exp-year': 'year',
}

// By name or id, for a field that does not say. The month and the year come
// before the expiry, which their names also match.
const BY_NAME: [RegExp, Slot][] = [
  [/card.?holder|name.?on.?card|cc.?name|nama.?(pada|di)?.?kartu|pemegang.?kartu/i, 'cardholder'],
  [/card.?num|cc.?num|credit.?card|nomor.?kartu|no.?kartu|^(card|cc)$/i, 'number'],
  [/exp.*(month|mm)|bulan/i, 'month'],
  [/exp.*(year|yy)|tahun/i, 'year'],
  [/expir|exp.?date|cc.?exp|masa.?berlaku|kadaluarsa|^exp$/i, 'expiry'],
]

function slotOf(field: FieldInfo): Slot | null {
  // "billing cc-number": the last word names the field.
  const token = field.autocomplete.trim().toLowerCase().split(/\s+/).pop() ?? ''
  // A field that names something else, the security code included, is not one.
  if (token && token !== 'on' && token !== 'off') return AUTOCOMPLETE[token] ?? null

  for (const [pattern, slot] of BY_NAME) {
    if (pattern.test(field.name) || pattern.test(field.id)) return slot
  }
  return null
}

/** Whether the digits pass the check every card number carries (Luhn). */
function luhn(digits: string): boolean {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2
    sum += digit
  }
  return sum % 10 === 0
}

/** The expiry as the vault keeps it, MM/YY, or undefined when it does not read as one. */
export function toExpiry(month: string, year: string): string | undefined {
  const mm = Number(month.match(/\d+/)?.[0])
  const yy = year.match(/\d+/)?.[0]?.slice(-2)
  if (!(mm >= 1 && mm <= 12) || yy?.length !== 2) return undefined
  return `${String(mm).padStart(2, '0')}/${yy}`
}

/**
 * The card in a form's filled fields, or null when they hold none: a number
 * of 12 to 19 digits that passes the Luhn check.
 */
export function cardFrom(fields: FieldInfo[]): CapturedCard | null {
  const found: Partial<Record<Slot, string>> = {}
  for (const field of fields) {
    const value = field.value.trim().slice(0, 200)
    const slot = value && slotOf(field)
    if (slot && !found[slot]) found[slot] = value
  }

  const number = found.number?.replace(/[\s-]/g, '') ?? ''
  if (!/^\d{12,19}$/.test(number) || !luhn(number)) return null

  const card: CapturedCard = { number }
  if (found.cardholder) card.cardholder = found.cardholder
  // "12/29", "12 / 2029", "1229", or a month and a year apart.
  const [month, year] = found.expiry
    ? (found.expiry.match(/^\s*(\d{1,2})\s*[/-]?\s*(\d{2}|\d{4})\s*$/)?.slice(1) ?? [])
    : [found.month, found.year]
  const expiry = month && year ? toExpiry(month, year) : undefined
  if (expiry) card.expiry = expiry
  return card
}
