import type { Models } from '@montara-pass/shared/api/models'

import { describeActivity, deviceName } from '@montara-pass/shared/activity'
import { formatDateTime } from '@montara-pass/shared/date'
import { IconHistory } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import type { AppColumnDef } from '@/types/column'

import CellItem from '@/components/block/common/cell-item'
import EmptyState from '@/components/block/common/empty-state'
import ReactTable from '@/components/block/common/react-table'
import SectionCard from '@/components/block/common/section-card'
import { RowsSkeleton } from '@/components/layout/page-skeleton'
import { usePaginationQuery } from '@/hooks/use-pagination-query'
import { useAllItems } from '@/hooks/use-vault'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'

type ColumnType = AppColumnDef<Models.Activity>

/**
 * The signed-in user's activity log: their sign-ins, what they did to items,
 * and what others did to the items they share. The server names an item by
 * id only; its name comes from the vault decrypted here.
 */
export default function ActivityLog() {
  const { offset, limit, pageIndex } = usePaginationQuery()
  const params = useMemo(() => ({ offset, limit }), [offset, limit])

  const { data, isFetching, isLoading, isError, error } = useQuery(queries.activity.list(params))
  const { data: profile } = useQuery(queries.auth.profile())
  const { data: items } = useAllItems()
  const loading = isLoading || isFetching
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

  const columns = useMemo<ColumnType[]>(
    () => [
      {
        accessorKey: 'created_at',
        header: 'When',
        cell: (info) => (
          <CellItem loading={loading}>
            <span className="whitespace-nowrap">{formatDateTime(info.getValue() as string)}</span>
          </CellItem>
        ),
      },
      {
        accessorKey: 'action',
        header: 'Activity',
        cell: ({ row }) => (
          <CellItem loading={loading}>
            <span>
              {describeActivity(
                row.original,
                meId,
                row.original.item_id ? names.get(row.original.item_id) : undefined
              )}
            </span>
          </CellItem>
        ),
      },
      {
        accessorKey: 'ip',
        header: 'Device',
        cell: ({ row }) => (
          <CellItem loading={loading}>
            {row.original.action === 'sign_in' ? (
              <span className="text-muted-foreground">
                {deviceName(row.original.user_agent) || 'Unknown device'}
                {row.original.ip && <span className="font-mono"> · {row.original.ip}</span>}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </CellItem>
        ),
      },
    ],
    [loading, meId, names]
  )

  return (
    <SectionCard
      title="Activity"
      description="Your sign-ins, and who created, changed, shared or removed the items you have access to. Kept for 90 days."
    >
      {isLoading ? (
        <RowsSkeleton />
      ) : !loading && total === 0 ? (
        <EmptyState
          icon={IconHistory}
          title="No activity yet"
          description="Signing in and changing items in your vault shows up here."
        />
      ) : (
        <ReactTable
          columns={columns}
          data={rows}
          total={total}
          pageIndex={pageIndex}
          pageSize={limit}
        />
      )}
    </SectionCard>
  )
}
