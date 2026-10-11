import { IconAlertTriangle, IconCopy, IconShieldCheck } from '@tabler/icons-react'
import { useMemo, useState } from 'react'

import type { VaultItem } from '@/types/vault'

import EmptyState from '@/components/block/common/empty-state'
import SectionCard from '@/components/block/common/section-card'
import { EditItemForm } from '@/components/block/vault/form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAllItems } from '@/hooks/use-vault'
import { itemIcon } from '@/lib/crypto/vault'
import { passwordHealth } from '@/lib/password'

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd
        className={
          alert && value > 0
            ? 'text-destructive text-2xl font-semibold tabular-nums'
            : 'text-2xl font-semibold tabular-nums'
        }
      >
        {value}
      </dd>
    </div>
  )
}

function Row({ item, onOpen }: { item: VaultItem; onOpen: (item: VaultItem) => void }) {
  const icon = itemIcon(item.secret)

  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      {icon ? (
        <img src={icon} alt="" className="size-5 shrink-0 rounded" />
      ) : (
        <span className="bg-muted size-5 shrink-0 rounded" aria-hidden />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{item.secret!.name}</span>
        <span className="text-muted-foreground truncate text-xs">
          {item.secret!.username || 'No username'}
        </span>
      </span>
      <Button variant="outline" size="sm" onClick={() => onOpen(item)}>
        {item.role === 'viewer' ? 'View' : 'Change'}
      </Button>
    </li>
  )
}

/**
 * Which logins have a weak password and which share one. The check runs in
 * the browser, on the decrypted vault; no password leaves it.
 */
export default function PasswordHealth() {
  const { data: items, isLoading, isError } = useAllItems()
  const [open, setOpen] = useState<VaultItem | null>(null)

  const health = useMemo(() => passwordHealth(items ?? []), [items])
  const reusedCount = health.reused.reduce((sum, group) => sum + group.length, 0)

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Password Health"
        description="Checked in your browser, on your decrypted vault. No password leaves it."
      >
        {isError ? (
          <EmptyState
            icon={IconAlertTriangle}
            title="Could not load your vault"
            description="Reload the page to try again."
          />
        ) : (
          <dl className="grid gap-3 sm:grid-cols-3">
            <Stat label="Logins checked" value={health.checked} />
            <Stat label="Reused" value={reusedCount} alert />
            <Stat label="Weak" value={health.weak.length} alert />
          </dl>
        )}
      </SectionCard>

      {!isError && health.checked > 0 && reusedCount === 0 && health.weak.length === 0 && (
        <SectionCard title="Nothing to fix">
          <EmptyState
            icon={IconShieldCheck}
            title="No weak or reused passwords"
            description="Every login has its own password, and none of them is short or simple."
          />
        </SectionCard>
      )}

      {health.reused.length > 0 && (
        <SectionCard
          title="Reused passwords"
          description="If one of these sites leaks the password, the others are open too."
        >
          <div className="flex flex-col gap-3">
            {health.reused.map((group) => (
              <div key={group[0].id} className="rounded-lg border">
                <p className="text-muted-foreground flex items-center gap-2 border-b px-4 py-2 text-xs">
                  <IconCopy className="size-3.5" />
                  One password, {group.length} logins
                </p>
                <ul className="divide-y">
                  {group.map((item) => (
                    <Row key={item.id} item={item} onOpen={setOpen} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {health.weak.length > 0 && (
        <SectionCard
          title="Weak passwords"
          description="Short, or made of few kinds of characters, so quick to guess."
        >
          <ul className="divide-y rounded-lg border">
            {health.weak.map((item) => (
              <Row key={item.id} item={item} onOpen={setOpen} />
            ))}
          </ul>
        </SectionCard>
      )}

      {open && (
        <EditItemForm
          // A different login is a different form.
          key={open.id}
          open
          onOpenChange={(next) => !next && setOpen(null)}
          record={open}
        />
      )}
    </div>
  )
}
