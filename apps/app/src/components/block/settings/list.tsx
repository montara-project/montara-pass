import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useState } from 'react'

import { MONO_NOTE } from '@/components/block/security/section'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const PAGE_SIZES = [10, 25, 50]

/** How many pager buttons show at once, the current page among them. */
const WINDOW = 5

/** A list's page and size, kept on the list: two lists share the page, so not in the URL. */
export function usePage<T>(rows: readonly T[]) {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(PAGE_SIZES[0])
  const pages = Math.max(1, Math.ceil(rows.length / size))
  // A delete can empty the last page: fall back to the one before it.
  const current = Math.min(page, pages - 1)
  return {
    rows: rows.slice(current * size, current * size + size),
    footer: {
      page: current,
      pages,
      size,
      total: rows.length,
      onPage: (next: number) => setPage(next),
      onSize: (next: number) => {
        setSize(next)
        setPage(0)
      },
    },
  }
}

/**
 * A part of the Settings page: its name and one line on what it holds, a
 * button or a count at the right, and its card under both.
 */
export function SettingsSection({
  id,
  title,
  description,
  aside,
  children,
}: {
  id: string
  title: string
  description: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <header className="flex flex-wrap items-end gap-x-3 gap-y-2 px-1">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id={id} className="text-[15px] font-semibold">
            {title}
          </h2>
          <p className="text-muted-foreground text-[13px]">{description}</p>
        </div>
        {aside}
      </header>
      {children}
    </section>
  )
}

/** The card a section's rows sit in. */
export function ListCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-card bg-panel fade-in overflow-hidden border">{children}</div>
}

/** One row: its tile, a name over a mono line, then whatever it offers at the right. */
export function ListRow({
  tile,
  name,
  meta,
  children,
}: {
  tile: React.ReactNode
  name: React.ReactNode
  meta: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-[11px]">
      {tile}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-semibold">{name}</span>
        {/* Cut short on a narrow screen: the full line shows on hover. */}
        <span
          className="text-muted-foreground truncate font-mono text-[11px]"
          title={typeof meta === 'string' ? meta : undefined}
        >
          {meta}
        </span>
      </div>
      {children}
    </li>
  )
}

/** The rows of a card, a rule between each. */
export function ListRows({ children }: { children: React.ReactNode }) {
  return <ul className="divide-border/60 m-0 list-none divide-y p-0">{children}</ul>
}

const PAGE_BUTTON =
  'bg-card hover:bg-hover text-muted-foreground hover:text-foreground inline-flex size-[26px] items-center justify-center rounded-sm border font-mono text-[11px] font-semibold tabular-nums transition-colors duration-[120ms] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none'

/**
 * A card's last line: how many rows a page holds, then which rows show out
 * of how many and the way to the other pages. `page` counts from 0.
 */
export function ListFooter({
  label,
  page,
  pages,
  size,
  total,
  onPage,
  onSize,
}: {
  /** What the rows are, for the pager's accessible name. */
  label: string
} & ReturnType<typeof usePage>['footer']) {
  const from = page * size
  const start = Math.max(0, Math.min(page - Math.floor(WINDOW / 2), pages - WINDOW))
  const numbers = Array.from({ length: Math.min(WINDOW, pages) }, (_, i) => start + i)

  return (
    <footer className="border-border flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t px-4 py-[9px]">
      <div className="flex items-center gap-2">
        <span className={MONO_NOTE} aria-hidden="true">
          Rows per page
        </span>
        <Select value={String(size)} onValueChange={(value) => onSize(Number(value))}>
          <SelectTrigger
            size="xs"
            aria-label="Rows per page"
            className="bg-background border-border h-[26px] w-auto font-mono"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <nav aria-label={`${label} pages`} className="flex items-center gap-3.5">
        <span className={cn(MONO_NOTE, 'tabular-nums')}>
          {from + 1}–{Math.min(from + size, total)} of {total}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={PAGE_BUTTON}
            aria-label="Previous page"
            disabled={page <= 0}
            onClick={() => onPage(page - 1)}
          >
            <IconChevronLeft className="size-3" />
          </button>
          {numbers.map((number) => (
            <button
              key={number}
              type="button"
              className={cn(
                PAGE_BUTTON,
                number === page &&
                  'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground border-transparent'
              )}
              aria-label={`Page ${number + 1}`}
              aria-current={number === page ? 'page' : undefined}
              onClick={() => onPage(number)}
            >
              {number + 1}
            </button>
          ))}
          <button
            type="button"
            className={PAGE_BUTTON}
            aria-label="Next page"
            disabled={page >= pages - 1}
            onClick={() => onPage(page + 1)}
          >
            <IconChevronRight className="size-3" />
          </button>
        </div>
      </nav>
    </footer>
  )
}

/** Rows in their loading shape, so the card does not jump when they arrive. */
export function ListSkeleton() {
  return (
    <ListRows>
      {[0, 1, 2].map((row) => (
        <li key={row} className="flex items-center gap-3 px-4 py-[11px]" aria-hidden="true">
          <Skeleton className="size-8 rounded-md" />
          <span className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-40 max-w-full" />
            <Skeleton className="h-3 w-28 max-w-full" />
          </span>
        </li>
      ))}
    </ListRows>
  )
}
