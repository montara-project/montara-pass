import { cn } from '@/lib/utils'

/** The mono line style for labels, counts and footnotes on the page. */
export const MONO_NOTE = 'text-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase'

/** A small mono mark beside a line: green when on, plain when off. */
export function Chip({ on, children }: { on?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-[5px] px-[7px] font-mono text-[10px] font-medium tracking-[0.06em] uppercase',
        on ? 'bg-good/15 text-good' : 'bg-card text-muted-foreground'
      )}
    >
      {children}
    </span>
  )
}

/**
 * A way to sign in, as a card of its own: its tile, its name and one line on
 * what it does, its state and its action at the right, whatever it opens
 * under that, and a mono footnote at its foot.
 */
export function MethodCard({
  id,
  icon: Icon,
  on,
  title,
  description,
  aside,
  footnote,
  className,
  children,
}: {
  id: string
  icon: React.ComponentType<{ className?: string }>
  /** Lit when the method is set up. */
  on?: boolean
  title: string
  description: string
  aside?: React.ReactNode
  footnote: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn('rounded-card bg-panel fade-in flex flex-col border', className)}
    >
      <div className="border-border/60 flex flex-wrap items-center gap-x-3.5 gap-y-3 border-b px-4 py-3">
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
          <span
            className={cn(
              'bg-background inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] border',
              on ? 'text-good' : 'text-muted-foreground'
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id={id} className="text-[13px] font-semibold">
              {title}
            </h2>
            <p className="text-muted-foreground text-xs">{description}</p>
          </div>
        </div>
        {aside && <div className="flex items-center gap-2.5">{aside}</div>}
      </div>
      {children}
      <p className={cn(MONO_NOTE, 'mt-auto flex items-center gap-2 px-4 py-2.5 text-[9.5px]')}>
        {footnote}
      </p>
    </section>
  )
}
