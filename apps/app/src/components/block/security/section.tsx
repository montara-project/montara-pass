import { cn } from '@/lib/utils'

/** The mono line style for labels, counts and footnotes on the page. */
export const MONO_NOTE = 'text-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase'

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
