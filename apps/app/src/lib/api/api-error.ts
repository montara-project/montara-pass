import { errorMessage } from '@montara-pass/shared/string'
import { toast } from 'sonner'

import { ApiError } from './client-fetch'

/**
 * Extract a readable message from an API failure. Validation failures from the
 * Go API carry `errors: [{ code, field, message, param }]`; every message is
 * listed.
 */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fieldMessages = (error.body?.errors ?? []).map((item) => item.message).filter(Boolean)

    if (fieldMessages.length > 0) {
      return `${error.body?.message || 'Validation failed'}:\n${fieldMessages.join('\n')}`
    }

    return error.message
  }

  return errorMessage(error, 'An error occurred')
}

/** True when the API answered 404, which several vault routes use as a state. */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

/**
 * True when the API answered 403. A refusal the user can act on carries its
 * reason in `message` (the plan gate on sharing does), so the caller shows
 * that where the action was taken instead of in a toast that scrolls away.
 */
export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403
}

export function throwApiError(error: unknown): never {
  throw new Error(apiErrorMessage(error))
}

/** Toast the message extracted by {@link apiErrorMessage}. */
export function toastApiError(error: unknown) {
  toast.error(apiErrorMessage(error))
}
