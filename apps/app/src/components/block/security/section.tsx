import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** The mono line style for labels, counts and footnotes on the page. */
export const MONO_NOTE = 'text-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase'

const PAGE_BUTTON = 'h-7 px-2 font-mono text-[10px] tracking-[0.08em] uppercase'

/**
 * A card's last line: which rows are shown out of how many, and the way to
 * the page before and after. `page` counts from 0.
 */
export function Pager({
  page,
  pageSize,
  shown,
  total,
  onTurn,
}: {
  page: number
  pageSize: number
  /** How many rows this page holds. */
  shown: number
  total: number
  onTurn: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = page * pageSize
  return (
    <footer className="border-border/60 flex items-center gap-2 border-t px-4 py-2.5">
      <span className={cn(MONO_NOTE, 'flex-1 tabular-nums')}>
        {total === 0 ? '0 of 0' : `${from + 1}–${Math.min(from + shown, total)} of ${total}`}
      </span>
      <Button
        variant="ghost"
        size="xs"
        className={PAGE_BUTTON}
        disabled={page <= 0}
        onClick={() => onTurn(page - 1)}
      >
        Prev
      </Button>
      <span className="bg-background border-border inline-flex size-6 items-center justify-center rounded-sm border font-mono text-[11px] tabular-nums">
        {page + 1}
      </span>
      <Button
        variant="ghost"
        size="xs"
        className={PAGE_BUTTON}
        disabled={page >= pages - 1}
        onClick={() => onTurn(page + 1)}
      >
        Next
      </Button>
    </footer>
  )
}

/** A small status mark beside a line: green when on, plain when off. */
export function StatusChip({ on, children }: { on?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'bg-background inline-flex h-5 shrink-0 items-center rounded-sm border px-2 font-mono text-[10px] font-medium tracking-[0.08em] uppercase',
        on ? 'text-good' : 'text-muted-foreground'
      )}
    >
      {children}
    </span>
  )
}

/**
 * A part of the Security page: what it is on the left, its one action on the
 * right, and its card under both.
 */
export function SecuritySection({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id={id} className="text-[15px] font-semibold">
            {title}
          </h2>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        {action}
      </header>
      <div className="rounded-card bg-panel overflow-hidden border">{children}</div>
    </section>
  )
}
