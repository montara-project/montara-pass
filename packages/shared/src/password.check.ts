// The self-check of generatePassword's ambiguous option: the characters easy
// to confuse stay out unless they are asked for.
// Run: node packages/shared/src/password.check.ts

import assert from 'node:assert/strict'

// By address, so Node finds the file without the bundler's resolution.
const { generatePassword } = (await import(
  new URL('./password.ts', import.meta.url).href
)) as typeof import('./password')

const CONFUSED = /[0O1lI]/

// Off, as by default: none of them, however many characters are drawn.
for (let i = 0; i < 200; i++) {
  assert.doesNotMatch(generatePassword({ length: 64 }), CONFUSED)
}

// On: they turn up. 64 characters a draw, 200 draws: never seeing one would
// be all but impossible.
const drawn = Array.from({ length: 200 }, () => generatePassword({ length: 64, ambiguous: true }))
assert.match(drawn.join(''), CONFUSED)

console.log('password.check: ok')
