import type { VaultItem } from '@montara-pass/shared/types/vault'

import { passwordHealth } from '@montara-pass/shared/password'
import { IconLayoutGrid, IconRefresh, IconShieldCheck } from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { EditItemForm } from '@/components/block/vault/form'
import ItemTile from '@/components/block/vault/item-tile'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAllItems } from '@/hooks/use-vault'
import { cn } from '@/lib/utils'

const MONO_NOTE = 'text-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase'

/** A count in the page head: green at nought, amber when there is something to fix. */
function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="bg-background flex h-[30px] items-center gap-2.5 rounded-md border px-2.5">
      <dt className={MONO_NOTE}>{label}</dt>
      <dd
        className={cn(
          'm-0 font-mono text-[13px] font-semibold tabular-nums',
          alert && (value > 0 ? 'text-warn' : 'text-good')
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/** A login in a list: the whole row opens it. A weak one says so at its end. */
function Row({ item, weak, onOpen }: { item: VaultItem; weak?: boolean; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="hover:bg-hover flex w-full items-center gap-3 px-3 py-[11px] text-left transition-colors duration-[120ms] -outline-offset-2 motion-reduce:transition-none"
      >
        <ItemTile item={item} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-medium">{item.secret!.name}</span>
          <span className="text-muted-foreground truncate text-xs">
            {item.secret!.username || 'No username'}
          </span>
        </span>
        {weak && (
          <span className="text-warn font-mono text-[10px] font-medium tracking-[0.08em] uppercase">
            Weak
          </span>
        )}
      </button>
    </li>
  )
}

/** One card of logins that share a password, each group under a line that names it. */
function ReusedCard({
  groups,
  onOpen,
}: {
  groups: VaultItem[][]
  onOpen: (item: VaultItem) => void
}) {
  return (
    <div className="rounded-card bg-panel overflow-hidden border">
      {groups.map((group, index) => (
        <div key={group[0].id} className={cn(index > 0 && 'border-t')}>
          <p
            className={cn(
              MONO_NOTE,
              'border-border/60 flex justify-between border-b px-3 py-[9px] tabular-nums'
            )}
          >
            <span className="text-foreground/80">One password, {group.length} logins</span>
            <span>{group.length} logins</span>
          </p>
          <ul className="divide-border/60 m-0 list-none divide-y p-0">
            {group.map((item) => (
              <Row key={item.id} item={item} onOpen={() => onOpen(item)} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function Section({
  title,
  description,
  className,
  children,
}: {
  title: string
  description: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-3', className)}>
      <header className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-muted-foreground text-xs">{description}</p>
      </header>
      {children}
    </section>
  )
}

/** Splits the groups in two, each half about as tall as the other. */
function halves(groups: VaultItem[][]): [VaultItem[][], VaultItem[][]] {
  const halfway = groups.reduce((sum, group) => sum + group.length + 1, 0) / 2
  const left: VaultItem[][] = []
  let rows = 0
  for (const group of groups) {
    if (rows >= halfway) break
    left.push(group)
    rows += group.length + 1
  }
  return [left, groups.slice(left.length)]
}

/**
 * Which logins have a weak password and which share one. The check runs in
 * the browser, on the decrypted vault; no password leaves it.
 */
export default function PasswordHealth() {
  const { data: items, isLoading, isError, isFetching, refetch } = useAllItems()
  const [open, setOpen] = useState<VaultItem | null>(null)

  const health = useMemo(() => passwordHealth(items ?? []), [items])
  const reusedCount = health.reused.reduce((sum, group) => sum + group.length, 0)
  const findings = reusedCount + health.weak.length
  const [left, right] = halves(health.reused)

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col">
      <header className="border-border/60 flex flex-wrap items-center gap-x-4 gap-y-3 border-b px-5 pt-[22px] pb-[18px] sm:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={MONO_NOTE}>Tools</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Password health</h1>
          <p className="text-muted-foreground text-[13px]">
            Checked in this browser. No password leaves it.
          </p>
        </div>
        {!isLoading && !isError && (
          <dl className="fade-in m-0 flex flex-wrap gap-2">
            <Stat label="Checked" value={health.checked} />
            <Stat label="Reused" value={reusedCount} alert />
            <Stat label="Weak" value={health.weak.length} alert />
          </dl>
        )}
      </header>

      <div className="px-5 pt-5 pb-7 sm:px-8">
        {isLoading ? (
          <Skeleton className="rounded-card h-[276px]" aria-hidden="true" />
        ) : isError ? (
          <p role="alert" className="text-danger text-[13px]">
            Could not load your vault. Reload the page to try again.
          </p>
        ) : findings === 0 ? (
          <div className="rounded-card bg-panel fade-in flex flex-col items-center gap-3 border px-6 py-11 text-center">
            <span className="bg-background text-good inline-flex size-11 items-center justify-center rounded-xl border">
              <IconShieldCheck className="size-5" aria-hidden />
            </span>
            <p className="text-[15px] font-semibold">
              {health.checked === 0 ? 'Nothing to check yet.' : 'Every login looks healthy.'}
            </p>
            <p className="text-muted-foreground max-w-[44ch] text-[13px] text-balance">
              {health.checked === 0
                ? 'No login in the vault has a password. Add one, and its strength shows here.'
                : 'Nothing is reused and nothing is weak. Run the scan again after you add new logins.'}
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Button size="sm" disabled={isFetching} onClick={() => void refetch()}>
                <IconRefresh
                  className={cn(isFetching && 'animate-spin motion-reduce:animate-none')}
                />
                {isFetching ? 'Scanning…' : 'Run scan'}
              </Button>
              <Button asChild variant="secondary" size="sm" className="border">
                <Link to="/vault">
                  <IconLayoutGrid />
                  Open vault
                </Link>
              </Button>
            </div>
            <p className={cn(MONO_NOTE, 'mt-1')}>
              Scanned {health.checked} {health.checked === 1 ? 'login' : 'logins'} · 0 findings
            </p>
          </div>
        ) : (
          // Reused takes two columns when there are groups enough for two, weak the third.
          <div className="fade-in grid items-start gap-5 lg:grid-cols-3">
            {health.reused.length > 0 && (
              <Section
                title="Reused passwords"
                description="If one site leaks the password, the others are open too."
                className={cn(right.length > 0 && 'lg:col-span-2')}
              >
                <div className={cn('grid items-start gap-5', right.length > 0 && 'sm:grid-cols-2')}>
                  <ReusedCard groups={left} onOpen={setOpen} />
                  {right.length > 0 && <ReusedCard groups={right} onOpen={setOpen} />}
                </div>
              </Section>
            )}

            {health.weak.length > 0 && (
              <Section
                title="Weak passwords"
                description="Short, or made of few kinds of characters, so quick to guess."
              >
                <ul className="rounded-card bg-panel divide-border/60 m-0 list-none divide-y overflow-hidden border p-0">
                  {health.weak.map((item) => (
                    <Row key={item.id} item={item} weak onOpen={() => setOpen(item)} />
                  ))}
                </ul>
                <p className={cn(MONO_NOTE, 'tabular-nums')}>
                  {health.weak.length} of {health.checked} logins · open one to fix it
                </p>
              </Section>
            )}
          </div>
        )}
      </div>

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
