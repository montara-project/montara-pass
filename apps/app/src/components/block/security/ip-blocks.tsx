import type { Models } from '@montara-pass/shared/api/models'

import { ipKind } from '@montara-pass/shared/activity'
import { formatDateTime } from '@montara-pass/shared/date'
import { IconForbid, IconSearch, IconShieldCheck } from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { IPBlockListParams } from '@/lib/api/services/security'
import type { AppColumnDef } from '@/types/column'

import EmptyState from '@/components/block/common/empty-state'
import ReactTable, { WIDE_ONLY } from '@/components/block/common/react-table'
import SimpleAlertDialog from '@/components/block/common/simple-alert-dialog'
import BlockIPForm from '@/components/block/security/block-form'
import { SettingsSection } from '@/components/block/settings/list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

type Column = AppColumnDef<Models.IPBlock>

interface IpBlockCardProps {
  /** Matches the address or the reason, on the server. */
  search?: string
  page: number
  size: number
  onPage: (page: number) => void
  onSize: (size: number) => void
  /** A line above the headings: the search and the way to block one. */
  toolbar?: React.ReactNode
}

/**
 * The API's blocked IPs, as a card: what the auto-block did after repeated
 * failures, and what a super user blocked by hand. Blocking is enforced on
 * the server; this is the record, and the hand that lifts a block early.
 */
function IpBlockCard({ search, page, size, onPage, onSize, toolbar }: IpBlockCardProps) {
  const [lifting, setLifting] = useState<Models.IPBlock | null>(null)
  const unblock = useMutation(queries.security.unblock())
  const params = useMemo<IPBlockListParams>(
    () => ({ offset: page * size, limit: size, search: search || undefined }),
    [page, size, search]
  )
  const { data, isLoading, isError, error } = useQuery(queries.security.list(params))
  const total = data?.metadata?.total ?? 0
  const blocks = data?.data ?? []

  useEffect(() => {
    if (isError) toastApiError(error)
  }, [isError, error])

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

  const columns = useMemo<Column[]>(
    () => [
      {
        accessorKey: 'ip',
        header: 'Address',
        cell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                'bg-background inline-flex size-[30px] shrink-0 items-center justify-center rounded-md border',
                row.original.status === 'active' ? 'text-warn' : 'text-muted-foreground'
              )}
            >
              <IconForbid className="size-4" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-mono text-[13px] font-medium">{row.original.ip}</span>
              <span className="text-muted-foreground font-mono text-[11px]">
                {ipKind(row.original.ip)}
              </span>
            </span>
          </span>
        ),
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        meta: { headerClassName: WIDE_ONLY, cellClassName: WIDE_ONLY },
        cell: ({ row }) => (
          <span className="flex min-w-0 flex-col">
            <span className="truncate" title={row.original.reason ?? undefined}>
              {row.original.reason ?? '—'}
            </span>
            <span className="text-muted-foreground font-mono text-[11px]">
              {row.original.source === 'auto' ? 'Blocked automatically' : 'Blocked by hand'}
            </span>
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 96,
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex h-5 items-center rounded-[5px] px-[7px] font-mono text-[10px] font-medium tracking-[0.06em] uppercase',
              row.original.status === 'active'
                ? 'bg-warn/15 text-warn'
                : 'bg-card text-muted-foreground'
            )}
          >
            {row.original.status === 'active' ? 'Blocked' : row.original.status}
          </span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Blocked',
        size: 190,
        meta: { headerClassName: WIDE_ONLY, cellClassName: WIDE_ONLY },
        cell: ({ row }) => (
          <span className="flex min-w-0 flex-col">
            <span className="font-mono text-xs tabular-nums">
              {formatDateTime(row.original.created_at)}
            </span>
            <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
              {row.original.blocked_until
                ? `Until ${formatDateTime(row.original.blocked_until)}`
                : 'No end'}
            </span>
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="block text-right">Action</span>,
        size: 104,
        cell: ({ row }) => (
          <span className="flex justify-end">
            {/* Only a live block has anything to lift. */}
            {row.original.status === 'active' && (
              <Button
                variant="outline"
                size="xs"
                className="bg-card h-[26px] px-2.5 text-xs"
                disabled={unblock.isPending}
                onClick={() => setLifting(row.original)}
              >
                Unblock
              </Button>
            )}
          </span>
        ),
      },
    ],
    [unblock.isPending]
  )

  return (
    <>
      <ReactTable
        label="IP blocks"
        columns={columns}
        data={blocks}
        total={total}
        pageIndex={page}
        pageSize={size}
        isLoading={isLoading}
        onPageChange={onPage}
        onPageSizeChange={onSize}
        toolbar={toolbar}
        emptyMessage={
          isError ? (
            <p role="alert" className="text-danger px-4 py-6 text-[13px]">
              The IP blocks could not be read. Reload the page to try again.
            </p>
          ) : (
            <EmptyState
              framed={false}
              icon={IconShieldCheck}
              title={search ? 'No block matches' : 'No IP is blocked'}
              description={
                search
                  ? 'Try another address or word from the reason.'
                  : 'An IP that fails too many requests is blocked on its own and shows up here; you can also block one by hand.'
              }
            />
          )
        }
      />

      <SimpleAlertDialog
        title={`Let ${lifting?.ip ?? 'this IP'} through?`}
        description="The block is lifted now, for every request it was keeping out. The record stays in the list."
        open={lifting !== null}
        onOpenChange={(open) => !open && setLifting(null)}
        onConfirm={() => void lift()}
        confirmText="Unblock"
        variant="destructive"
      />
    </>
  )
}

/**
 * The IP blocks, a part of Settings' Security tab for the super user only (the
 * server refuses anyone else too): a search over the address and the reason,
 * and the way to block one. Its place in the list is its own, so the audit
 * log's page in the URL is left alone.
 */
export function IpBlockSection() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [openBlock, setOpenBlock] = useState(false)

  // Asked of the server once typing pauses, from the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <SettingsSection
      id="ip-blocks"
      title="IP block"
      description="Addresses refused at sign-in. Blocking one does not revoke a session already signed in."
    >
      <IpBlockCard
        search={search}
        page={page}
        size={size}
        onPage={setPage}
        onSize={(next) => {
          setSize(next)
          setPage(0)
        }}
        toolbar={
          <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-4 py-1.5">
            <div className="relative w-full max-w-[260px] min-w-40 flex-1">
              <IconSearch
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search address or reason"
                aria-label="Search IP blocks by address or reason"
                className="bg-background border-border h-8 pl-8 text-[13px]"
              />
            </div>
            <Button size="xs" onClick={() => setOpenBlock(true)}>
              <IconForbid />
              Block an address
            </Button>
          </div>
        }
      />
      <BlockIPForm open={openBlock} onOpenChange={setOpenBlock} />
    </SettingsSection>
  )
}
