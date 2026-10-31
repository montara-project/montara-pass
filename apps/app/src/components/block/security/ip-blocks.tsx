import { IconForbid, IconShieldLock } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import type { IPBlockListParams } from '@/lib/api/services/security'

import EmptyState from '@/components/block/common/empty-state'
import ReactTable from '@/components/block/common/react-table'
import SectionCard from '@/components/block/common/section-card'
import BlockIPForm from '@/components/block/security/block-form'
import { RowsSkeleton } from '@/components/layout/page-skeleton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePaginationQuery } from '@/hooks/use-pagination-query'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'

import { IPBlockColumn } from './columns'

/** The statuses the list may be narrowed to; "all" is no status at all. */
const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'lifted', label: 'Lifted' },
] as const

/**
 * The API's blocked IPs: what the auto-block did after repeated failures, and
 * what a super user blocked by hand. Blocking is enforced on the server; this
 * page is the record, and the hand that lifts a block early.
 */
export default function IpBlocks() {
  const { status } = useSearch({ from: '/(app)/settings/ip-blocks/' })
  const navigate = useNavigate()
  const { offset, limit, pageIndex } = usePaginationQuery()
  const [openBlock, setOpenBlock] = useState(false)

  // Only a status the server knows leaves the search; anything else reads all.
  const statusFilter =
    status === 'active' || status === 'lifted' || status === 'expired' ? status : undefined
  const params = useMemo<IPBlockListParams>(
    () => ({ offset, limit, status: statusFilter }),
    [offset, limit, statusFilter]
  )

  const { data, isFetching, isLoading, isError, error } = useQuery(queries.security.list(params))
  const loading = isLoading || isFetching
  const total = data?.metadata?.total ?? 0
  const blocks = data?.data ?? []

  useEffect(() => {
    if (isError) toastApiError(error)
  }, [isError, error])

  const columns = IPBlockColumn({ loading })

  return (
    <SectionCard
      title="IP blocks"
      description="Client IPs shut out of the API: blocked by hand here, or automatically after repeated failed requests."
      toolbar={
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter ?? 'all'}
            onValueChange={(value) =>
              void navigate({
                to: '.',
                search: (prev) => ({ ...prev, status: value === 'all' ? undefined : value }),
                replace: true,
              })
            }
          >
            <SelectTrigger className="w-32" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setOpenBlock(true)}>
            <IconForbid />
            Block IP
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <RowsSkeleton />
      ) : !loading && blocks.length === 0 ? (
        <EmptyState
          icon={IconShieldLock}
          title="No IP is blocked"
          description="An IP that fails too many requests is blocked on its own and shows up here; you can also block one by hand."
        />
      ) : (
        <ReactTable
          columns={columns}
          data={blocks}
          total={total}
          pageIndex={pageIndex}
          pageSize={limit}
        />
      )}

      <BlockIPForm open={openBlock} onOpenChange={setOpenBlock} />
    </SectionCard>
  )
}
