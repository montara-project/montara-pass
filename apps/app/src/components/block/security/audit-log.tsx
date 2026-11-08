import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'

import { usePaginationQuery } from '@/hooks/use-pagination-query'
import { useAllItems } from '@/hooks/use-vault'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'

import AuditTable from './audit-table'
import { Pager, SecuritySection } from './section'

/**
 * The signed-in user's activity log: their sign-ins, what they did to items,
 * and what others did to the items they share. The server names an item by
 * id only; its name comes from the vault decrypted here.
 */
export default function AuditLog() {
  const navigate = useNavigate()
  const { offset, limit, pageIndex } = usePaginationQuery()
  const params = useMemo(() => ({ offset, limit }), [offset, limit])

  const { data, isLoading, isError, error } = useQuery(queries.activity.list(params))
  const { data: profile } = useQuery(queries.auth.profile())
  const { data: items } = useAllItems()
  const total = data?.metadata?.total ?? 0
  const rows = data?.data ?? []

  useEffect(() => {
    if (isError) toastApiError(error)
  }, [isError, error])

  const meId = profile?.user.id ?? ''
  const names = useMemo(
    () => new Map((items ?? []).map((item) => [item.id, item.secret?.name])),
    [items]
  )

  const turn = (page: number) =>
    void navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({ ...prev, page: page || undefined }),
      replace: true,
    })

  return (
    <SecuritySection
      id="audit-log"
      title="Audit log"
      description="Sign-ins and changes to the items you have access to, kept 90 days."
    >
      <AuditTable
        rows={rows}
        total={total}
        pageSize={limit}
        isLoading={isLoading}
        meId={meId}
        names={names}
        footer={
          <Pager
            page={pageIndex}
            pageSize={limit}
            shown={rows.length}
            total={total}
            onTurn={turn}
          />
        }
      />
    </SecuritySection>
  )
}
