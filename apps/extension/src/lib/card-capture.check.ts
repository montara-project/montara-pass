// The self-check of cardFrom: which form fields hold a payment card.
// Run: node src/lib/card-capture.check.ts

import assert from 'node:assert/strict'

// By address, so Node finds the file without the bundler's resolution.
const { cardFrom } = (await import(
  new URL('./card-capture.ts', import.meta.url).href
)) as typeof import('./card-capture')

const field = (
  value: string,
  rest: Partial<Record<'autocomplete' | 'name' | 'id' | 'type', string>>
) => ({ autocomplete: '', name: '', id: '', type: 'text', value, ...rest })

// Fields that say what they take; the security code is left out.
assert.deepEqual(
  cardFrom([
    field('Aji Jha', { autocomplete: 'cc-name' }),
    field('4111 1111 1111 1111', { autocomplete: 'cc-number' }),
    field('12 / 2029', { autocomplete: 'cc-exp' }),
    field('123', { autocomplete: 'cc-csc' }),
  ]),
  { cardholder: 'Aji Jha', number: '4111111111111111', expiry: '12/29' }
)

// Fields that do not say, read by name; a month and a year apart.
assert.deepEqual(
  cardFrom([
    field('Aji Jha', { name: 'card_holder' }),
    field('5555-5555-5555-4444', { name: 'card_number' }),
    field('3', { name: 'exp_month' }),
    field('2031', { name: 'exp_year' }),
    field('999', { name: 'cvv' }),
  ]),
  { cardholder: 'Aji Jha', number: '5555555555554444', expiry: '03/31' }
)

// An expiry that does not read as one is left for the user to type.
assert.deepEqual(
  cardFrom([field('4111111111111111', { name: 'cardnumber' }), field('13/29', { name: 'expiry' })]),
  {
    number: '4111111111111111',
  }
)

// A number that fails the Luhn check, or is too short, is not a card.
assert.equal(cardFrom([field('4111 1111 1111 1112', { autocomplete: 'cc-number' })]), null)
assert.equal(cardFrom([field('12345', { name: 'card_number' })]), null)
// No number, no card.
assert.equal(cardFrom([field('Aji Jha', { autocomplete: 'cc-name' })]), null)

console.log('card-capture: ok')
