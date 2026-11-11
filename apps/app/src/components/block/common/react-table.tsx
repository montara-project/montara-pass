/* eslint-disable react-hooks/incompatible-library */

import {
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  flexRender,
  globalFilteringFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'
import { type ReactNode } from 'react'

import { MONO_NOTE } from '@/components/block/security/section'
import { ListFooter, ListSkeleton } from '@/components/block/settings/list'
import { cn } from '@/lib/utils'

export const features = tableFeatures({
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
})

/**
 * A column's `meta.headerClassName` and `meta.cellClassName` go on its heading
 * and cells; WIDE_ONLY there hides a column when the table is narrow.
 */
export const WIDE_ONLY = '@max-[720px]/table:hidden'

interface ReactTableProps<T extends RowData> {
  columns: ColumnDef<typeof features, T, unknown>[]
  data: T[]
  /** What the rows are, for the pager's accessible name. */
  label: string
  pageSize?: number
  /** 0-based; the server pages the rows, so `data` is this page only. */
  pageIndex?: number
  total: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  getRowId?: (row: T) => string
  /** Stands in for the pager under the table, for a page that turns its own way. */
  footer?: ReactNode
  /** Row-shaped skeletons while the first page loads. */
  isLoading?: boolean
  /** Shown in the card instead of the table when there are no rows. */
  emptyMessage?: ReactNode
  /** A line at the top of the card, above the headings: a search, a button. */
  toolbar?: ReactNode
}

/**
 * The app's table, in the IP blocks' card: mono headings over rows with a rule
 * between each, then the rows-per-page and pager footer. A column's `size`
 * fixes its width; the others share what is left.
 */
export default function ReactTable<T extends RowData>({
  columns,
  data,
  label,
  pageSize = 10,
  pageIndex = 0,
  total,
  onPageChange,
  onPageSizeChange,
  getRowId,
  footer,
  isLoading,
  emptyMessage,
  toolbar,
}: ReactTableProps<T>) {
  const table = useTable({
    features,
    columns,
    data,
    pageCount: Math.ceil(total / pageSize),
    getRowId: getRowId ?? ((row: T) => String((row as Record<string, unknown>).id)),
    manualPagination: true,
    state: { pagination: { pageIndex, pageSize } },
  })

  const renderBody = () => {
    if (isLoading) return <ListSkeleton />
    if (data.length === 0) return emptyMessage
    return (
      <>
        <table className="w-full table-fixed border-collapse text-[13px]">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-border border-b">
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    style={header.column.columnDef.size ? { width: header.getSize() } : undefined}
                    className={cn(
                      MONO_NOTE,
                      'px-1.5 py-2.5 text-left font-normal first:pl-4 last:pr-4',
                      header.column.columnDef.meta?.headerClassName
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-border/60 divide-y">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      'min-w-0 px-1.5 py-2 align-middle first:pl-4 last:pr-4',
                      cell.column.columnDef.meta?.cellClassName
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {footer === undefined ? (
          <ListFooter
            label={label}
            page={pageIndex}
            pages={Math.max(1, Math.ceil(total / pageSize))}
            size={pageSize}
            total={total}
            onPage={(page) => onPageChange?.(page)}
            onSize={(size) => onPageSizeChange?.(size)}
          />
        ) : (
          footer
        )}
      </>
    )
  }

  return (
    <div className="rounded-card bg-panel fade-in @container/table overflow-hidden border">
      {toolbar}
      {renderBody()}
    </div>
  )
}
