import * as Crypto from 'expo-crypto'

// Hermes has no WebCrypto. The vault crypto from @montara-pass/shared runs on
// the web output today; on native this fills the smallest gap — random bytes —
// until a development build brings a native Argon2id (hash-wasm needs
// WebAssembly, which Hermes does not have).
const globalCrypto = globalThis.crypto ?? (globalThis.crypto = {} as typeof globalThis.crypto)

if (!globalCrypto.getRandomValues) {
  globalCrypto.getRandomValues = Crypto.getRandomValues as typeof globalCrypto.getRandomValues
}
