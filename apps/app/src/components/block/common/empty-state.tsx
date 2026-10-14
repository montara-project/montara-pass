import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  className?: string
}

/**
 * Nothing to list: said in the middle of where the list would be. The way to
 * add the first one is the page's own button, not a second one here.
 */
export default function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-1 px-6 py-14 text-center', className)}>
      <p className="text-[15px] font-medium text-balance">{title}</p>
      {description && (
        <p className="text-muted-foreground text-[13px] text-balance">{description}</p>
      )}
    </div>
  )
}
