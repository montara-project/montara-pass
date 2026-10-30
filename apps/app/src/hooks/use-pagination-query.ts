import { useSearch } from '@tanstack/react-router'

/** `?page=` (0-based) and `?pageSize=` of a paged table. */
export type PaginationSearch = { page?: number; pageSize?: number }

/** A search param as text; the router reads `?plan=123` as a number. */
export function searchText(value: unknown): string | undefined {
  return value === undefined || value === null || value === '' ? undefined : String(value)
}

/** A search param as a whole number of 0 or more; garbage like `?page=abc` is dropped. */
export function searchIndex(value: unknown): number | undefined {
  const n = Number(value)
  return value !== null && value !== '' && Number.isInteger(n) && n >= 0 ? n : undefined
}

/** `validateSearch` for a route with a paged table. */
export function validatePaginationSearch(search: Record<string, unknown>): PaginationSearch {
  return { page: searchIndex(search.page), pageSize: searchIndex(search.pageSize) }
}

/**
 * Read server pagination from the URL. `offset` is 0-based and `limit` is
 * capped at 100 server-side; `pageIndex` is what the table components expect.
 */
export function usePaginationQuery() {
  const { page = 0, pageSize = 10 }: PaginationSearch = useSearch({ strict: false })
  return { offset: page * pageSize, limit: pageSize, pageIndex: page }
}
