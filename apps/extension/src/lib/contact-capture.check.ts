// The self-check of contactFrom: which form fields hold a contact.
// Run: node src/lib/contact-capture.check.ts

import assert from 'node:assert/strict'

// By address, so Node finds the file without the bundler's resolution.
const { contactFrom } = (await import(
  new URL('./contact-capture.ts', import.meta.url).href
)) as typeof import('./contact-capture')

const field = (
  value: string,
  rest: Partial<Record<'autocomplete' | 'name' | 'id' | 'type' | 'label', string>>
) => ({
  autocomplete: '',
  name: '',
  id: '',
  type: 'text',
  value,
  ...rest,
})

// Fields that say what they take.
assert.deepEqual(
  contactFrom([
    field('Aji', { autocomplete: 'given-name' }),
    field('Jha', { autocomplete: 'family-name' }),
    field('aji@mail.com', { type: 'email', autocomplete: 'email' }),
    field('Jl. Merdeka 1', { autocomplete: 'shipping address-line1' }),
    field('RT 02', { autocomplete: 'shipping address-line2' }),
    field('Jakarta', { autocomplete: 'address-level2' }),
    field('12345', { autocomplete: 'postal-code' }),
    field('Indonesia', { autocomplete: 'country-name' }),
  ]),
  {
    firstName: 'Aji',
    lastName: 'Jha',
    email: 'aji@mail.com',
    address: 'Jl. Merdeka 1, RT 02',
    city: 'Jakarta',
    postalCode: '12345',
    country: 'Indonesia',
  }
)

// Fields that do not say, read by name; one whole name is split.
assert.deepEqual(
  contactFrom([
    field('Aji Kumar Jha', { name: 'nama' }),
    field('08123', { name: 'no_hp', type: 'tel' }),
    field('Jl. Merdeka 1', { name: 'alamat' }),
    field('Bandung', { id: 'kota' }),
  ]),
  {
    firstName: 'Aji',
    lastName: 'Kumar Jha',
    phone: '08123',
    address: 'Jl. Merdeka 1',
    city: 'Bandung',
  }
)

// An email field named for its address is an email, not an address.
assert.deepEqual(
  contactFrom([
    field('Aji', { name: 'first_name' }),
    field('aji@mail.com', { name: 'email_address' }),
    field('Acme', { name: 'company_name' }),
  ]),
  { firstName: 'Aji', email: 'aji@mail.com', company: 'Acme' }
)

// A sign-up or a message: a name and an email are not a contact.
assert.equal(
  contactFrom([field('Aji', { autocomplete: 'name' }), field('a@b.c', { type: 'email' })]),
  null
)
// A field that names something else is left out, by name or not.
assert.equal(
  contactFrom([
    field('aji', { autocomplete: 'username', name: 'name' }),
    field('Jl. Merdeka 1', { name: 'address' }),
  ]),
  null
)
// Empty fields count for nothing.
assert.equal(contactFrom([field(' ', { name: 'name' }), field('', { name: 'address' })]), null)

// A country picked by its code is kept by the name shown for it.
assert.deepEqual(
  contactFrom([
    field('Aji Jha', { autocomplete: 'name' }),
    field('ID', { autocomplete: 'country', label: 'Indonesia' }),
  ]),
  { firstName: 'Aji', lastName: 'Jha', country: 'Indonesia' }
)
// A shipping and a billing address: the first one, not both run together.
assert.deepEqual(
  contactFrom([
    field('Aji', { autocomplete: 'given-name' }),
    field('Jl. Merdeka 1', { autocomplete: 'shipping address-line1' }),
    field('Blok A', { autocomplete: 'shipping address-line2' }),
    field('Jl. Sudirman 9', { autocomplete: 'billing address-line1' }),
  ]),
  { firstName: 'Aji', address: 'Jl. Merdeka 1, Blok A' }
)
// A whole name fills the last name the form did not give apart.
assert.deepEqual(
  contactFrom([
    field('Aji', { autocomplete: 'given-name' }),
    field('Aji Jha', { name: 'full_name' }),
    field('08123', { type: 'tel' }),
  ]),
  { firstName: 'Aji', lastName: 'Jha', phone: '08123' }
)

console.log('contact-capture: ok')
