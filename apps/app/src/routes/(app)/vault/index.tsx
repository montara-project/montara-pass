import { createFileRoute } from '@tanstack/react-router'

import Vault from '@/components/block/vault/vault'
import PageSkeleton from '@/components/layout/page-skeleton'
import { searchIndex, searchText } from '@/hooks/use-pagination-query'

/** The list's filters, page and open item; the search term is kept out of the URL. */
export type VaultSearch = {
  folder?: string
  type?: string
  favorite?: boolean
  page?: number
  item?: string
}

export const Route = createFileRoute('/(app)/vault/')({
  validateSearch: (search: Record<string, unknown>): VaultSearch => ({
    folder: searchText(search.folder),
    type: searchText(search.type),
    favorite: search.favorite === true || search.favorite === 'true' ? true : undefined,
    page: searchIndex(search.page),
    item: searchText(search.item),
  }),
  component: Vault,
  pendingComponent: PageSkeleton,
})
