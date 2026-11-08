// The self-check of isLoopback: which servers may be reached over plain http.
// Run: node src/lib/origin.check.ts
import assert from 'node:assert/strict'

import { hostOf, isLoopback } from './origin.ts'

// This machine: a local server may use plain http.
for (const url of [
  'http://localhost:8080',
  'http://api.localhost',
  'http://127.0.0.1:8080',
  'http://127.1.2.3',
  'http://[::1]:8080',
]) {
  assert.ok(isLoopback(hostOf(url) ?? ''), url)
}

// Anything else crosses the network.
for (const url of [
  'http://192.168.1.10:8080',
  'http://localhost.example.com',
  'http://127.0.0.1.example.com',
  'http://vault.example.com',
  'http://notlocalhost',
]) {
  assert.ok(!isLoopback(hostOf(url) ?? ''), url)
}

console.log('origin: ok')
