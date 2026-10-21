import type { AxiosError } from 'axios'

import { errorMessage } from '@montara-pass/shared/string'
import { toast } from 'sonner'

import type { ApiErrorResponse } from '@/types/api'

/**
 * Extract a readable message from an API failure. Validation failures from the
 * Go API carry `errors: [{ code, field, message, param }]`; every message is
 * listed.
 */
export function axiosErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const body = error.response?.data as ApiErrorResponse | undefined
    const fieldMessages = (body?.errors ?? []).map((item) => item.message).filter(Boolean)

    if (fieldMessages.length > 0) {
      return `${body?.message || 'Validation failed'}:\n${fieldMessages.join('\n')}`
    }

    return body?.message || error.message || 'An error unknown occurred'
  }

  return errorMessage(error, 'An error occurred')
}

/** Narrow an unknown error to an axios error without importing the class value. */
function isAxiosError(error: unknown): error is AxiosError {
  return (error as AxiosError | undefined)?.isAxiosError === true
}

/** True when the API answered 404, which several vault routes use as a state. */
export function isNotFound(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404
}

/**
 * True when the API answered 403. A refusal the user can act on carries its
 * reason in `message` (the plan gate on sharing does), so the caller shows
 * that where the action was taken instead of in a toast that scrolls away.
 */
export function isForbidden(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 403
}

export function throwAxiosError(error: unknown): never {
  throw new Error(axiosErrorMessage(error))
}

/** Toast the message extracted by {@link axiosErrorMessage}. */
export function toastAxiosError(error: unknown) {
  toast.error(axiosErrorMessage(error))
}
