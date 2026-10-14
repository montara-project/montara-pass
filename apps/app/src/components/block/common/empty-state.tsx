import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  /** What will be here, or how to put the first one here. */
  description?: string
  /** The page's own line icon, in a tile: the one picture an empty page has. */
  icon?: React.ComponentType<{ className?: string }>
  /** Outlined, as the table it stands in for would be. Off inside a list that has its own edge. */
  framed?: boolean
  className?: string
}

/**
 * Nothing to list: said where the list would be, in the list's own shape.
 * The way to add the first one is the page's own button, not a second one
 * here.
 */
export default function EmptyState({
  title,
  description,
  icon: Icon,
  framed = true,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'fade-in flex flex-col items-center justify-center gap-4 px-6 py-14 text-center',
        framed && 'rounded-card min-h-[320px] border',
        className
      )}
    >
      {Icon && (
        <span className="rounded-card bg-background text-muted-foreground inline-flex size-12 items-center justify-center border">
          <Icon className="size-5" />
        </span>
      )}
      <div className="flex max-w-[44ch] flex-col gap-1">
        <p className="text-[15px] font-semibold text-balance">{title}</p>
        {description && (
          <p className="text-muted-foreground text-[13px] text-balance">{description}</p>
        )}
      </div>
    </div>
  )
}
