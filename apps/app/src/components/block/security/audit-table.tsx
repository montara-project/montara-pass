import type { Models } from '@montara-pass/shared/api/models'

import { describeActivity, deviceName, ipKind } from '@montara-pass/shared/activity'
import { formatDateTime } from '@montara-pass/shared/date'
import { IconDeviceDesktop } from '@tabler/icons-react'
import { useMemo, type ReactNode } from 'react'

import type { AppColumnDef } from '@/types/column'

import ReactTable from '@/components/block/common/react-table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { MONO_NOTE } from './section'

// Shared by the web app and the extension's Security page. Borders name their
// color: the extension has no Tailwind preflight, so a bare one is currentColor.

/** The two middle columns go when the card is too narrow to hold them. */
const WIDE_ONLY = '@max-[640px]/log:hidden'

/** The log's look on the grid: mono headings, hairlines between rows, no hover. */
const HEADER_ROW =
  '[&>th]:h-auto [&>th]:py-2.5 [&>th]:font-mono [&>th]:text-[10px] [&>th]:tracking-[0.08em] [&>th]:uppercase [&>th]:text-muted-foreground [&>th]:border-border/60'
const BODY_ROW = 'hover:bg-transparent [&>td]:py-2.5 [&>td]:border-border/60'

interface AuditTableProps {
  rows: Models.Activity[]
  total: number
  /** How many rows the page holds, and how many skeleton rows stand in for them. */
  pageSize: number
  isLoading?: boolean
  /** The signed-in user, so their own changes read as "You". */
  meId: string
  /** Item names by id, from the vault decrypted on this device. */
  names: Map<string, string | undefined>
  /** How the page moves through the log: pages in the web app, more rows in the extension. */
  footer: ReactNode
}

/**
 * The activity log as a table: the device, the IP address, what happened and
 * when. The server names an item by id only; its name comes from the vault.
 */
export default function AuditTable({
  rows,
  total,
  pageSize,
  isLoading,
  meId,
  names,
  footer,
}: AuditTableProps) {
  const columns = useMemo<AppColumnDef<Models.Activity>[]>(() => {
    const what = (row: Models.Activity) =>
      describeActivity(row, meId, row.item_id ? names.get(row.item_id) : undefined)

    // Sizes are proportions: a fixed table shares out the width it has.
    return [
      {
        id: 'device',
        header: 'Device',
        size: 130,
        meta: { skeleton: <Skeleton className="h-4 w-2/3" /> },
        cell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="bg-background border-border inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-solid">
              <IconDeviceDesktop className="size-3.5" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-medium">
                {row.original.action === 'sign_in'
                  ? deviceName(row.original.user_agent) || 'Unknown device'
                  : '—'}
              </span>
              {/* Narrow, what happened goes under the device. */}
              <span className="text-muted-foreground hidden truncate text-xs @max-[640px]/log:block">
                {what(row.original)}
              </span>
            </span>
          </span>
        ),
      },
      {
        id: 'ip',
        header: 'IP address',
        size: 80,
        meta: {
          headerClassName: WIDE_ONLY,
          cellClassName: WIDE_ONLY,
          skeleton: <Skeleton className="h-4 w-3/4" />,
        },
        cell: ({ row }) =>
          row.original.ip ? (
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-mono text-xs">{row.original.ip}</span>
              <span className={cn(MONO_NOTE, 'normal-case')}>{ipKind(row.original.ip)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'activity',
        header: 'Activity',
        size: 160,
        meta: {
          headerClassName: WIDE_ONLY,
          cellClassName: WIDE_ONLY,
          skeleton: <Skeleton className="h-4 w-1/2" />,
        },
        cell: ({ row }) => <span className="block truncate text-[13px]">{what(row.original)}</span>,
      },
      {
        id: 'when',
        header: 'When',
        size: 90,
        meta: { skeleton: <Skeleton className="h-4 w-2/3" /> },
        cell: ({ row }) => (
          <span className="font-mono text-xs whitespace-nowrap tabular-nums">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
    ]
  }, [meId, names])

  return (
    <div className="@container/log">
      <ReactTable
        columns={columns}
        data={rows}
        total={total}
        pageSize={pageSize}
        isLoading={isLoading}
        bordered={false}
        footer={footer}
        emptyMessage={
          <span className="text-[13px]">
            No activity yet. Signing in and changing items shows up here.
          </span>
        }
        tableLayout={{
          headerBackground: false,
          columnsResizable: false,
          columnsPinnable: false,
          columnsMovable: false,
        }}
        tableClassNames={{ edgeCell: '', headerRow: HEADER_ROW, bodyRow: BODY_ROW }}
      />
    </div>
  )
}
