import type { Models } from '@montara-pass/shared/api/models'

import { describeActivity, deviceName } from '@montara-pass/shared/activity'
import { ITEM_TYPE_LABEL } from '@montara-pass/shared/constants/vault'
import { formatDateTime } from '@montara-pass/shared/date'
import { IconHistory } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'

import EmptyState from '@/components/block/common/empty-state'
import {
  ListCard,
  ListFooter,
  ListRow,
  ListRows,
  ListSkeleton,
  SettingsSection,
} from '@/components/block/settings/list'
import { usePaginationQuery } from '@/hooks/use-pagination-query'
import { useAllItems } from '@/hooks/use-vault'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

import { MONO_NOTE } from './section'

/** A row's dot, by what kind of thing happened: the words beside it say what. */
const DOT: Partial<Record<Models.Activity['action'], string>> = {
  sign_in: 'bg-good',
  item_created: 'bg-focus',
  item_updated: 'bg-focus',
  item_restored: 'bg-focus',
  item_shared: 'bg-focus',
  item_role_changed: 'bg-warn',
  item_trashed: 'bg-warn',
  item_deleted: 'bg-warn',
  item_member_removed: 'bg-warn',
}

/** The mono line under a row: where a sign-in came from, or what kind of item it was. */
function source(row: Models.Activity) {
  if (row.action === 'sign_in') {
    return [deviceName(row.user_agent) || 'Unknown device', row.ip].filter(Boolean).join(' · ')
  }
  return (row.item_type && ITEM_TYPE_LABEL[row.item_type]) ?? 'Item'
}

/**
 * The signed-in user's activity log: their sign-ins, what they did to items,
 * and what others did to the items they share. The server names an item by
 * id only; its name comes from the vault decrypted here. Pages come from the
 * server, so the page and its size live in the URL.
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

  const search = (next: Record<string, unknown>) =>
    void navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({ ...prev, ...next }),
      replace: true,
    })

  // Loading, nothing logged yet, or the rows and the way through them.
  const renderList = () => {
    if (isLoading) return <ListSkeleton />
    if (rows.length === 0) {
      return (
        <EmptyState
          framed={false}
          icon={IconHistory}
          title="Nothing logged yet"
          description="Sign-ins and changes to your items show here."
        />
      )
    }
    return (
      <>
        <ListRows>
          {rows.map((row) => (
            <ListRow
              key={row.id}
              tile={
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    DOT[row.action] ?? 'bg-muted-foreground'
                  )}
                />
              }
              name={describeActivity(row, meId, row.item_id ? names.get(row.item_id) : undefined)}
              meta={source(row)}
            >
              <time
                dateTime={row.created_at}
                className="text-muted-foreground hidden shrink-0 font-mono text-[11px] tabular-nums sm:block"
              >
                {formatDateTime(row.created_at)}
              </time>
            </ListRow>
          ))}
        </ListRows>
        <ListFooter
          label="Audit log"
          page={pageIndex}
          pages={Math.max(1, Math.ceil(total / limit))}
          size={limit}
          total={total}
          onPage={(page) => search({ page: page || undefined })}
          // Another size starts again from the first page.
          onSize={(pageSize) => search({ pageSize, page: undefined })}
        />
      </>
    )
  }

  return (
    <SettingsSection
      id="audit-log"
      title="Audit log"
      description="Sign-ins and changes to the items you have access to. Kept for 90 days."
      aside={!isLoading && <span className={cn(MONO_NOTE, 'tabular-nums')}>{total} events</span>}
    >
      <ListCard>{renderList()}</ListCard>
    </SettingsSection>
  )
}
