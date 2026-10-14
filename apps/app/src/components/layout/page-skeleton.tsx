import { Skeleton } from '@/components/ui/skeleton'

/** Rows that stand in for a list or a table while it is fetched. */
export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-card divide-y overflow-hidden border" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex h-[57px] items-center gap-4 px-5">
          {/* Lengths that differ, as names do. */}
          <Skeleton className="h-3.5" style={{ width: `${28 + ((index * 17) % 30)}%` }} />
          <Skeleton className="ml-auto h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

/**
 * A page that is on its way: its heading and a few rows, in the shape most
 * pages have. Shown only when a page takes long enough to be noticed.
 */
export default function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-5 sm:p-8" role="status" aria-label="Loading">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-40 max-w-full" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        <Skeleton className="rounded-control h-10 w-32" />
      </div>
      <RowsSkeleton />
    </div>
  )
}
