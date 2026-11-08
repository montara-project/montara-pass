import type { Models } from '@montara-pass/shared/api/models'

import { ipKind } from '@montara-pass/shared/activity'
import { formatDateTime } from '@montara-pass/shared/date'
import { IconForbid, IconShieldCheck } from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { IPBlockListParams } from '@/lib/api/services/security'

import SimpleAlertDialog from '@/components/block/common/simple-alert-dialog'
import BlockIPForm from '@/components/block/security/block-form'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { usePaginationQuery } from '@/hooks/use-pagination-query'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

import { MONO_NOTE } from './section'

/** The statuses the list may be narrowed to; "all" is no status at all. */
const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'lifted', label: 'Lifted' },
] as const

const COLUMNS =
  'grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.3fr)_minmax(0,1fr)_88px] gap-3'

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
  const [lifting, setLifting] = useState<Models.IPBlock | null>(null)
  const unblock = useMutation(queries.security.unblock())

  // Only a status the server knows leaves the search; anything else reads all.
  const statusFilter =
    status === 'active' || status === 'lifted' || status === 'expired' ? status : undefined
  const params = useMemo<IPBlockListParams>(
    () => ({ offset, limit, status: statusFilter }),
    [offset, limit, statusFilter]
  )

  const { data, isLoading, isError, error } = useQuery(queries.security.list(params))
  const total = data?.metadata?.total ?? 0
  const blocks = data?.data ?? []
  const pages = Math.max(1, Math.ceil(total / limit))

  useEffect(() => {
    if (isError) toastApiError(error)
  }, [isError, error])

  const search = (next: Record<string, unknown>) =>
    void navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({ ...prev, ...next }),
      replace: true,
    })

  const lift = async () => {
    const target = lifting
    setLifting(null)
    if (!target) return
    try {
      await unblock.mutateAsync(target.id)
      toast.success('IP unblocked')
    } catch (err) {
      toastApiError(err)
    }
  }

  // The list's place: loading, the error, nothing blocked, or the blocks.
  // Failed with nothing from before to show.
  const unreadable = isError && blocks.length === 0
  const renderList = () => {
    if (isLoading) {
      return <Skeleton className="rounded-card h-40" aria-hidden="true" />
    }
    if (unreadable) {
      return (
        <p role="alert" className="text-danger text-[13px]">
          The IP blocks could not be read. Reload the page to try again.
        </p>
      )
    }
    if (blocks.length === 0) {
      return (
        <div className="rounded-card bg-panel fade-in flex flex-col items-center gap-3 border px-6 py-11 text-center">
          <span className="bg-background text-good inline-flex size-11 items-center justify-center rounded-xl border">
            <IconShieldCheck className="size-5" aria-hidden />
          </span>
          <p className="text-[15px] font-semibold">
            {statusFilter ? `No ${statusFilter} block` : 'No IP is blocked'}
          </p>
          <p className="text-muted-foreground max-w-[48ch] text-[13px] text-balance">
            An IP that fails too many requests is blocked on its own and shows up here; you can also
            block one by hand.
          </p>
          <Button size="sm" className="mt-1" onClick={() => setOpenBlock(true)}>
            <IconForbid />
            Block IP
          </Button>
        </div>
      )
    }
    return (
      // The middle columns go when the page is too narrow to hold them.
      <div className="rounded-card bg-panel fade-in @container/blocks overflow-hidden border">
        <div
          className={cn(
            COLUMNS,
            MONO_NOTE,
            'border-border/60 border-b px-4 py-2.5 @max-[720px]/blocks:grid-cols-[minmax(0,1fr)_auto_88px]'
          )}
        >
          <span>IP</span>
          <span className="@max-[720px]/blocks:hidden">Source</span>
          <span className="@max-[720px]/blocks:hidden">Reason</span>
          <span>Status</span>
          <span className="@max-[720px]/blocks:hidden">Blocked</span>
          <span className="@max-[720px]/blocks:hidden">Until</span>
          <span>Action</span>
        </div>
        <ul className="divide-border/60 m-0 list-none divide-y p-0">
          {blocks.map((block) => (
            <li
              key={block.id}
              className={cn(
                COLUMNS,
                'items-center px-4 py-3 text-[13px] @max-[720px]/blocks:grid-cols-[minmax(0,1fr)_auto_88px]'
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-mono text-[13px] font-medium">{block.ip}</span>
                <span className={cn(MONO_NOTE, 'normal-case')}>{ipKind(block.ip)}</span>
              </span>
              <span className="@max-[720px]/blocks:hidden">{block.source}</span>
              <span className="text-muted-foreground truncate @max-[720px]/blocks:hidden">
                {block.reason ?? '—'}
              </span>
              <span>
                <span
                  className={cn(
                    'inline-flex rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.08em] uppercase',
                    block.status === 'active'
                      ? 'bg-warn/15 text-warn'
                      : 'text-muted-foreground border'
                  )}
                >
                  {block.status === 'active' ? 'Blocked' : block.status}
                </span>
              </span>
              <span className="font-mono text-xs tabular-nums @max-[720px]/blocks:hidden">
                {formatDateTime(block.created_at)}
              </span>
              <span className="font-mono text-xs tabular-nums @max-[720px]/blocks:hidden">
                {block.blocked_until ? formatDateTime(block.blocked_until) : 'forever'}
              </span>
              <span>
                {/* Only a live block has anything to lift. */}
                {block.status === 'active' && (
                  <Button
                    variant="outline"
                    size="xs"
                    className="w-full"
                    disabled={unblock.isPending}
                    onClick={() => setLifting(block)}
                  >
                    Unblock
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
        <footer className="border-border/60 flex items-center gap-2 border-t px-4 py-2.5">
          <span className={cn(MONO_NOTE, 'flex-1 tabular-nums')}>
            {offset + 1}–{Math.min(offset + blocks.length, total)} of {total}
          </span>
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 font-mono text-[10px] tracking-[0.08em] uppercase"
            disabled={pageIndex <= 0}
            onClick={() => search({ page: pageIndex - 1 || undefined })}
          >
            Prev
          </Button>
          <span className="bg-background inline-flex size-6 items-center justify-center rounded-sm border font-mono text-[11px] tabular-nums">
            {pageIndex + 1}
          </span>
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 font-mono text-[10px] tracking-[0.08em] uppercase"
            disabled={pageIndex >= pages - 1}
            onClick={() => search({ page: pageIndex + 1 })}
          >
            Next
          </Button>
        </footer>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col">
      <header className="border-border/60 flex flex-wrap items-center gap-x-4 gap-y-3 border-b px-5 pt-[22px] pb-[18px] sm:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={MONO_NOTE}>Admin · IP blocks</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">IP blocks</h1>
          <p className="text-muted-foreground text-[13px]">
            Client IPs shut out of the API: blocked by hand here, or automatically after repeated
            failed requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter ?? 'all'}
            // Another filter starts again from its first page.
            onValueChange={(value) =>
              search({ status: value === 'all' ? undefined : value, page: undefined })
            }
          >
            <SelectTrigger className="h-8 w-28" aria-label="Filter by status">
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
      </header>

      <div className="px-5 pt-5 pb-8 sm:px-8">{renderList()}</div>

      <SimpleAlertDialog
        title={`Let ${lifting?.ip ?? 'this IP'} through?`}
        description="The block is lifted now, for every request it was keeping out. The record stays in the list."
        open={lifting !== null}
        onOpenChange={(open) => !open && setLifting(null)}
        onConfirm={() => void lift()}
        confirmText="Unblock"
        variant="destructive"
      />

      <BlockIPForm open={openBlock} onOpenChange={setOpenBlock} />
    </div>
  )
}
