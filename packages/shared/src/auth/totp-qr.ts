import { renderSVG } from 'uqr'

// Apart from auth/totp.ts, which signing in needs: only turning TOTP on shows
// a QR code, so the encoder stays out of the sign-in screen.

/** The URI as a QR code for an authenticator app to scan, as an image source. */
export function totpQrCode(uri: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(renderSVG(uri))}`
}
