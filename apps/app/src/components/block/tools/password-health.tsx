import { IconChevronRight, IconShieldCheck } from '@tabler/icons-react'
import { useMemo, useState } from 'react'

import type { VaultItem } from '@/types/vault'

import { EditItemForm } from '@/components/block/vault/form'
import ItemTile from '@/components/block/vault/item-tile'
import ToolHead from '@/components/layout/tool-head'
import { Skeleton } from '@/components/ui/skeleton'
import { useAllItems } from '@/hooks/use-vault'
import { passwordHealth } from '@/lib/password'

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="rounded-row bg-card border px-3.5 py-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={
          alert && value > 0
            ? 'text-danger m-0 text-2xl font-semibold tabular-nums'
            : 'm-0 text-2xl font-semibold tabular-nums'
        }
      >
        {value}
      </dd>
    </div>
  )
}

/**
 * Logins that belong together sit in one card, a line between them: the ones
 * that share a password are seen to. The whole row opens the item.
 */
function Rows({ items, onOpen }: { items: VaultItem[]; onOpen: (item: VaultItem) => void }) {
  return (
    <ul className="rounded-card bg-card m-0 list-none divide-y overflow-hidden border p-0">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="group hover:bg-hover flex w-full items-center py-2.5 pr-3 pl-3.5 text-left transition-colors duration-[120ms] -outline-offset-2 motion-reduce:transition-none"
          >
            <span className="mr-3">
              <ItemTile item={item} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-medium tracking-[-0.005em]">
                {item.secret!.name}
              </span>
              <span className="text-muted-foreground truncate text-[13px]">
                {item.secret!.username || 'No username'}
              </span>
            </span>
            {/* Says the row leads somewhere; lit with the row. */}
            <IconChevronRight className="text-muted-foreground group-hover:text-foreground ml-2 size-[18px] shrink-0 transition-colors duration-[120ms] motion-reduce:transition-none" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    // Further from the part above it than its own heading is from what it says.
    <section className="mt-3 flex flex-col gap-4">
      <header className="flex flex-col gap-0.5">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="text-muted-foreground text-[13px]">{description}</p>
      </header>
      {children}
    </section>
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

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4 p-5 sm:p-8">
      <ToolHead
        icon={IconShieldCheck}
        title="Password health"
        description="Checked in this browser. No password leaves it."
      />

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3" aria-hidden="true">
          <Skeleton className="rounded-row h-[70px]" />
          <Skeleton className="rounded-row h-[70px]" />
          <Skeleton className="rounded-row h-[70px]" />
        </div>
      ) : isError ? (
        <p role="alert" className="text-danger text-[13px]">
          Could not load your vault. Reload the page to try again.
        </p>
      ) : (
        <>
          <dl className="m-0 grid grid-cols-3 gap-3">
            <Stat label="Logins checked" value={health.checked} />
            <Stat label="Reused" value={reusedCount} alert />
            <Stat label="Weak" value={health.weak.length} alert />
          </dl>

          {health.checked === 0 && (
            <p className="text-muted-foreground">
              No login in the vault has a password to check yet.
            </p>
          )}

          {health.checked > 0 && reusedCount === 0 && health.weak.length === 0 && (
            <p className="text-muted-foreground">
              Nothing to fix: every login has its own password, and none is short or simple.
            </p>
          )}

          {health.reused.length > 0 && (
            <Section
              title="Reused passwords"
              description="If one of these sites leaks the password, the others are open too."
            >
              {health.reused.map((group) => (
                <div key={group[0].id}>
                  {/* Names the card under it, in line with what the card holds. */}
                  <p className="text-muted-foreground mb-2 pl-1 text-[13px] font-medium tabular-nums">
                    One password, {group.length} logins
                  </p>
                  <Rows items={group} onOpen={setOpen} />
                </div>
              ))}
            </Section>
          )}

          {health.weak.length > 0 && (
            <Section
              title="Weak passwords"
              description="Short, or made of few kinds of characters, so quick to guess."
            >
              <Rows items={health.weak} onOpen={setOpen} />
            </Section>
          )}
        </>
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
