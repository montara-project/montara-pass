import { describeActivity, deviceName, ipKind } from '@montara-pass/shared/activity'
import { formatDateTime } from '@montara-pass/shared/date'
import { IconDeviceDesktop } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePaginationQuery } from '@/hooks/use-pagination-query'
import { useAllItems } from '@/hooks/use-vault'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

import { MONO_NOTE, SecuritySection } from './section'

const COLUMNS =
  'grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_minmax(0,0.9fr)] gap-4'

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
  const pages = Math.max(1, Math.ceil(total / limit))

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
      {/* The two middle columns go when the page is too narrow to hold them. */}
      <div className="@container/log">
        <div
          className={cn(
            COLUMNS,
            MONO_NOTE,
            'border-border/60 border-b px-4 py-2.5 @max-[640px]/log:grid-cols-[minmax(0,1fr)_auto]'
          )}
        >
          <span>Device</span>
          <span className="@max-[640px]/log:hidden">IP address</span>
          <span className="@max-[640px]/log:hidden">Activity</span>
          <span>When</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3 px-4 py-4" aria-hidden="true">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-[13px]">
            No activity yet. Signing in and changing items shows up here.
          </p>
        ) : (
          <ul className="divide-border/60 m-0 list-none divide-y p-0">
            {rows.map((row) => {
              const signIn = row.action === 'sign_in'
              const what = describeActivity(
                row,
                meId,
                row.item_id ? names.get(row.item_id) : undefined
              )
              return (
                <li
                  key={row.id}
                  className={cn(
                    COLUMNS,
                    'items-center px-4 py-2.5 @max-[640px]/log:grid-cols-[minmax(0,1fr)_auto]'
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="bg-background inline-flex size-7 shrink-0 items-center justify-center rounded-md border">
                      <IconDeviceDesktop className="size-3.5" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] font-medium">
                        {signIn ? deviceName(row.user_agent) || 'Unknown device' : '—'}
                      </span>
                      {/* Narrow, what happened goes under the device. */}
                      <span className="text-muted-foreground hidden truncate text-xs @max-[640px]/log:block">
                        {what}
                      </span>
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-col @max-[640px]/log:hidden">
                    {row.ip ? (
                      <>
                        <span className="truncate font-mono text-xs">{row.ip}</span>
                        <span className={cn(MONO_NOTE, 'normal-case')}>{ipKind(row.ip)}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                  <span className="min-w-0 truncate text-[13px] @max-[640px]/log:hidden">
                    {what}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-mono text-xs whitespace-nowrap tabular-nums">
                      {formatDateTime(row.created_at)}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        <footer className="border-border/60 flex items-center gap-2 border-t px-4 py-2.5">
          <span className={cn(MONO_NOTE, 'flex-1 tabular-nums')}>
            {total === 0
              ? '0 of 0'
              : `${offset + 1}–${Math.min(offset + rows.length, total)} of ${total}`}
          </span>
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 font-mono text-[10px] tracking-[0.08em] uppercase"
            disabled={pageIndex <= 0}
            onClick={() => turn(pageIndex - 1)}
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
            onClick={() => turn(pageIndex + 1)}
          >
            Next
          </Button>
        </footer>
      </div>
    </SecuritySection>
  )
}
