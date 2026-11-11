import { useSyncExternalStore } from 'react'

/**
 * Where this browser keeps the chosen zone. The account's zone lives in the
 * API (GET /me time_zone); this copy shows it before /me answers.
 */
const KEY = 'montara.time-zone'
/** Fired on this page when the zone changes; `storage` covers the other tabs. */
const EVENT = 'montara:time-zone'

/** What the header shows until another zone is chosen: what the API keeps its timestamps in. */
export const DEFAULT_TIME_ZONE = 'UTC'

/** Whether the browser knows the zone, so a stale or edited value falls back to the default. */
function isTimeZone(zone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

function read(): string {
  try {
    const zone = localStorage.getItem(KEY)
    return zone && isTimeZone(zone) ? zone : DEFAULT_TIME_ZONE
  } catch {
    // Storage blocked (private window, extension sandbox): the default stands.
    return DEFAULT_TIME_ZONE
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** The zone the header's clock and the profile use, kept in step across tabs. */
export function useTimeZone(): string {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_TIME_ZONE)
}

/** Show this zone here. Saving it to the account is the caller's job. */
export function setTimeZone(zone: string) {
  try {
    localStorage.setItem(KEY, zone)
  } catch {
    // Not saved, but this page still follows it until it reloads.
  }
  window.dispatchEvent(new Event(EVENT))
}

/** "UTC+7", "UTC-3:30" or "UTC": a zone's offset from UTC at the given moment. */
export function zoneOffset(zone: string, at = new Date()): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
    .formatToParts(at)
    .find((part) => part.type === 'timeZoneName')?.value
  if (!name) return zone
  // No offset to tell: "UTC" alone, as the header always read.
  return name === 'GMT' || name === 'GMT+0' ? 'UTC' : name.replace('GMT', 'UTC')
}

/** Every zone the browser knows, UTC first. */
export function timeZones(): string[] {
  const all = Intl.supportedValuesOf('timeZone')
  return [DEFAULT_TIME_ZONE, ...all.filter((zone) => zone !== DEFAULT_TIME_ZONE)]
}
