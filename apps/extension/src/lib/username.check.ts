// The self-check of maskUsername: what a list shows of a username.
// Run: node src/lib/username.check.ts

import assert from 'node:assert/strict'

// By address, so Node finds the file without the bundler's resolution.
const { maskUsername } = (await import(
  new URL('./username.ts', import.meta.url).href
)) as typeof import('./username')

// An email address keeps the start of its local part and its domain.
assert.equal(maskUsername('user0@mail.com'), 'us••••@mail.com')
assert.equal(maskUsername('jane.doe@example.co.id'), 'ja••••@example.co.id')
assert.equal(maskUsername('abc@mail.com'), 'a••••@mail.com')
assert.equal(maskUsername('a@mail.com'), 'a••••@mail.com')

// Any other username keeps its start.
assert.equal(maskUsername('9router'), '9r••••')
assert.equal(maskUsername('@handle'), '@h••••')
assert.equal(maskUsername('admin@localhost'), 'ad••••')
assert.equal(maskUsername('bob'), 'b••••')
assert.equal(maskUsername('x'), 'x••••')

// The mask is the same length whatever it hides.
assert.equal(maskUsername('averyveryverylongname@mail.com'), 'av••••@mail.com')
assert.equal(maskUsername('averyveryverylongname'), 'av••••')

// Nothing to mask.
assert.equal(maskUsername(''), '')

console.log('username: ok')
