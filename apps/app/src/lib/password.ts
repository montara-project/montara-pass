import type { VaultItem } from '@/types/vault'

// Generating passwords and judging the ones in the vault. Everything here
// runs on decrypted content in the client; nothing is sent anywhere. The
// extension uses this file too.

export interface PasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  digits: boolean
  symbols: boolean
}

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 64

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
}

/** Characters that are easy to confuse (0/O, 1/l/I) are left out. */
const SETS = {
  uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  lowercase: 'abcdefghijkmnopqrstuvwxyz',
  digits: '23456789',
  symbols: '!@#$%^&*-_=+',
} as const

function draw(charset: string, length: number): string {
  // Bytes that would bias the choice are thrown away, not wrapped.
  const limit = 256 - (256 % charset.length)
  let password = ''

  while (password.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit && password.length < length) password += charset[byte % charset.length]
    }
  }
  return password
}

/**
 * A random password with at least one character of every kind asked for.
 * With no kind chosen it falls back to lowercase letters.
 */
export function generatePassword(options: Partial<PasswordOptions> = {}): string {
  const wanted = { ...DEFAULT_PASSWORD_OPTIONS, ...options }
  const chosen = (Object.keys(SETS) as (keyof typeof SETS)[]).filter((kind) => wanted[kind])
  const sets = (chosen.length > 0 ? chosen : (['lowercase'] as const)).map((kind) => SETS[kind])
  const length = Math.min(Math.max(Math.floor(wanted.length), sets.length), MAX_PASSWORD_LENGTH)

  // Drawn again until every kind is there: any other way of forcing one in
  // would make some passwords more likely than others.
  for (;;) {
    const password = draw(sets.join(''), length)
    if (sets.every((set) => [...password].some((char) => set.includes(char)))) return password
  }
}

export type PasswordStrength = 'weak' | 'fair' | 'strong'

/**
 * A rough strength from length and variety: the bits a guesser would need if
 * the characters were random, not counting repeats and runs like "aaa" or
 * "1234", nor a block said over again like "Pa55!Pa55!Pa55!". Rounded to a
 * whole number.
 */
// ponytail: no dictionary, so "Summer2024!" passes as fair. zxcvbn would
// catch words, names and dates, at the cost of a few hundred kB in both apps.
export function passwordBits(password: string): number {
  const pool =
    (/[a-z]/.test(password) ? 26 : 0) +
    (/[A-Z]/.test(password) ? 26 : 0) +
    (/\d/.test(password) ? 10 : 0) +
    (/[^a-zA-Z\d]/.test(password) ? 33 : 0)

  // The characters that add something, when a character that only repeats
  // the one `period` places before it does not. Period 0 is no repeat at all.
  const counted = (period: number) => {
    let count = 0
    for (let i = 0; i < password.length; i++) {
      const step = i > 0 ? password.charCodeAt(i) - password.charCodeAt(i - 1) : NaN
      const repeats = period > 0 && i >= period && password[i] === password[i - period]
      if (!repeats && step !== 0 && step !== 1 && step !== -1) count++
    }
    return count
  }

  // A period counts only when at least half of what follows the first block
  // repeats it: a random password has stray matches at some distance too.
  let fewest = counted(0)
  for (let period = 2; period <= password.length / 2; period++) {
    let matches = 0
    for (let i = period; i < password.length; i++) {
      if (password[i] === password[i - period]) matches++
    }
    if (matches * 2 >= password.length - period) fewest = Math.min(fewest, counted(period))
  }

  return Math.round(fewest * Math.log2(pool || 1))
}

/** The bits at which a password stops being weak, and at which it is strong. */
export const FAIR_BITS = 50
export const STRONG_BITS = 80

export function passwordStrength(password: string): PasswordStrength {
  const bits = passwordBits(password)
  return bits < FAIR_BITS ? 'weak' : bits < STRONG_BITS ? 'fair' : 'strong'
}

/** What a character is, so a password can be shown with its kinds told apart. */
export function characterKind(char: string): 'letter' | 'digit' | 'symbol' {
  return /\d/.test(char) ? 'digit' : /[a-zA-Z]/.test(char) ? 'letter' : 'symbol'
}

export interface PasswordHealth {
  /** Logins that have a password and could be read. */
  checked: number
  weak: VaultItem[]
  /** Logins sharing one password, a group per password, largest first. */
  reused: VaultItem[][]
}

/** Which logins have a weak password, and which share one. */
export function passwordHealth(items: VaultItem[]): PasswordHealth {
  const logins = items.filter((item) => item.type === 'login' && item.secret?.password)
  const byPassword = new Map<string, VaultItem[]>()
  for (const item of logins) {
    const password = item.secret!.password!
    byPassword.set(password, [...(byPassword.get(password) ?? []), item])
  }

  return {
    checked: logins.length,
    weak: logins.filter((item) => passwordStrength(item.secret!.password!) === 'weak'),
    reused: [...byPassword.values()]
      .filter((group) => group.length > 1)
      .sort((a, b) => b.length - a.length),
  }
}
