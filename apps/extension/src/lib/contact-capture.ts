// Which fields of a form being sent hold a contact, read from what each field
// says it takes. src/entrypoints/content.ts runs it in every page, so it
// imports nothing at runtime.

import type { ContactField } from '@montara-pass/shared/constants/vault'

/** What the content script reads off a form field. */
export interface FieldInfo {
  autocomplete: string
  name: string
  id: string
  type: string
  value: string
  /** A select's chosen option as shown, where its value is a code. */
  label?: string
}

export type CapturedContact = Partial<Record<ContactField, string>>

/** A whole name goes in one field on many forms: it is split afterwards. */
type Slot = ContactField | 'fullName'

const AUTOCOMPLETE: Record<string, Slot> = {
  'given-name': 'firstName',
  'family-name': 'lastName',
  name: 'fullName',
  email: 'email',
  tel: 'phone',
  'tel-national': 'phone',
  organization: 'company',
  'street-address': 'address',
  'address-line1': 'address',
  'address-line2': 'address',
  'address-line3': 'address',
  'address-level2': 'city',
  'address-level1': 'state',
  'postal-code': 'postalCode',
  country: 'country',
  'country-name': 'country',
}

// By name or id, for a field that does not say. The first that matches wins,
// so "email_address" is an email and "company_name" a company.
const BY_NAME: [RegExp, Slot][] = [
  [/e-?mail/i, 'email'],
  [/phone|mobile|whatsapp|(^|[^a-z])tel([^a-z]|$)/i, 'phone'],
  [/company|organi[sz]ation|perusahaan/i, 'company'],
  [/first.?name|fname|given|nama.?depan/i, 'firstName'],
  [/last.?name|lname|surname|family|nama.?belakang/i, 'lastName'],
  [/zip|postal|post.?code|kode.?pos/i, 'postalCode'],
  [/city|town|kota/i, 'city'],
  [/province|provinsi|region|(^|[^a-z])state([^a-z]|$)/i, 'state'],
  [/country|negara/i, 'country'],
  [/address|street|alamat/i, 'address'],
  [/^(full.?)?name$|^nama(.?lengkap)?$/i, 'fullName'],
]

/** "shipping" or "billing", where the autocomplete names the section. */
function sectionOf(field: FieldInfo): string {
  return field.autocomplete.toLowerCase().match(/\b(shipping|billing)\b/)?.[1] ?? ''
}

function slotOf(field: FieldInfo): Slot | null {
  // "shipping street-address": the last word names the field.
  const token = field.autocomplete.trim().toLowerCase().split(/\s+/).pop() ?? ''
  // A field that names something else, a username or a card number, is not one.
  if (token && token !== 'on' && token !== 'off') return AUTOCOMPLETE[token] ?? null

  if (field.type === 'email') return 'email'
  if (field.type === 'tel') return 'phone'
  for (const [pattern, slot] of BY_NAME) {
    if (pattern.test(field.name) || pattern.test(field.id)) return slot
  }
  return null
}

/**
 * The contact in a form's filled fields, or null when they hold none: a name
 * with an address, a phone or a company. A name alone, or with an email, is
 * a sign-up or a message rather than someone's details.
 */
export function contactFrom(fields: FieldInfo[]): CapturedContact | null {
  const found: Partial<Record<Slot, string[]>> = {}
  // A checkout with a shipping and a billing address: the first one's lines.
  let addressSection: string | undefined
  for (const field of fields) {
    const slot = slotOf(field)
    // A country picked from a list by its code is kept by its name.
    const raw = slot === 'country' && field.label ? field.label : field.value
    const value = raw.trim().slice(0, 500)
    if (!slot || !value) continue
    if (slot === 'address') {
      addressSection ??= sectionOf(field)
      if (sectionOf(field) !== addressSection) continue
    }
    ;(found[slot] ??= []).push(value)
  }

  const contact: CapturedContact = {}
  for (const [slot, values] of Object.entries(found) as [Slot, string[]][]) {
    if (slot === 'fullName') continue
    // The lines of an address belong together; of anything else, the first.
    contact[slot] = slot === 'address' ? values.join(', ') : values[0]
  }
  // A whole name fills only the parts the form did not give apart.
  if (!contact.lastName && found.fullName) {
    const [first, ...rest] = found.fullName[0].split(/\s+/)
    contact.firstName ??= first
    if (rest.length) contact.lastName = rest.join(' ')
  }

  const named = !!(contact.firstName || contact.lastName)
  const more = (
    ['phone', 'company', 'address', 'city', 'state', 'postalCode', 'country'] as const
  ).some((key) => contact[key])
  return named && more ? contact : null
}
