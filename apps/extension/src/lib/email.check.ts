// The self-check of maskEmail: what a list shows of a username.
// Run: node src/lib/email.check.ts

import assert from 'node:assert/strict'

// By address, so Node finds the file without the bundler's resolution.
const { maskEmail } = (await import(
  new URL('./email.ts', import.meta.url).href
)) as typeof import('./email')

assert.equal(maskEmail('user0@mail.com'), 'us••••@mail.com')
assert.equal(maskEmail('jane.doe@example.co.id'), 'ja••••@example.co.id')
// A short local part keeps one character, so the mask hides most of it.
assert.equal(maskEmail('abc@mail.com'), 'a••••@mail.com')
assert.equal(maskEmail('a@mail.com'), 'a••••@mail.com')
// The mask is the same length whatever it hides.
assert.equal(maskEmail('averyveryverylongname@mail.com'), 'av••••@mail.com')

// Not an email address: shown whole.
for (const plain of ['9router', '@handle', 'admin@localhost', 'name with@space.com', '', 'x@']) {
  assert.equal(maskEmail(plain), plain)
}

console.log('email: ok')
