const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+'

/**
 * A random password. Characters that are easy to confuse (0/O, 1/l/I) are
 * left out; bytes that would bias the choice are thrown away, not wrapped.
 */
export function generatePassword(length = 20): string {
  const limit = 256 - (256 % CHARSET.length)
  let password = ''

  while (password.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit && password.length < length) {
        password += CHARSET[byte % CHARSET.length]
      }
    }
  }
  return password
}
