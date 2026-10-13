// The self-check of matchesSite: which page a saved login may be filled into.
// Run: node src/lib/site.check.ts

import assert from 'node:assert/strict'

// By address, so Node finds the file without the bundler's resolution.
const { matchesSite } = (await import(
  new URL('./site.ts', import.meta.url).href
)) as typeof import('./site')

const fits = (saved: string, page: string) => matchesSite(saved, page)

assert.ok(fits('https://example.com', 'https://example.com/sign-in'))
assert.ok(fits('example.com', 'https://login.example.com'))
assert.ok(fits('https://www.example.com', 'https://example.com'))
assert.ok(fits('https://example.com', 'https://www.example.com'))
assert.ok(!fits('https://login.example.com', 'https://example.com'))
assert.ok(!fits('https://example.com', 'https://example.com.evil.net'))
assert.ok(!fits('https://example.com', 'http://example.com'))
assert.ok(fits('http://localhost:5173', 'http://localhost:5173'))

// A suffix many share is its own site and nobody's parent, www included.
assert.ok(fits('https://github.io', 'https://github.io'))
assert.ok(!fits('https://github.io', 'https://evil.github.io'))
assert.ok(!fits('https://github.io', 'https://www.github.io'))
assert.ok(!fits('https://www.github.io', 'https://github.io'))
assert.ok(fits('https://www.github.io', 'https://www.github.io'))
assert.ok(fits('https://ada.github.io', 'https://www.ada.github.io'))

console.log('site: ok')
