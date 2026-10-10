'use client'

import { IconTrash } from '@tabler/icons-react'
import { useEffect, useMemo } from 'react'

import EmptyState from '@/components/block/common/empty-state'
import ReactTable from '@/components/block/common/react-table'
import SectionCard from '@/components/block/common/section-card'
import { usePaginationQuery } from '@/hooks/use-pagination-query'
import { useItems } from '@/hooks/use-vault'
import { toastAxiosError } from '@/lib/api/axios-error'

import { TrashColumn } from './column'

export default function TrashTable() {
  const { offset, limit, pageIndex } = usePaginationQuery()

  const params = useMemo(() => ({ offset, limit, trashed: true }), [offset, limit])

  const { data, isFetching, isLoading, isError, error } = useItems(params)
  const loading = isLoading || isFetching
  const total = data?.metadata?.total ?? 0
  const items = data?.data ?? []

  useEffect(() => {
    if (isError) toastAxiosError(error)
  }, [isError, error])

  const columns = TrashColumn({ loading })

  return (
    <SectionCard
      title="Trash"
      description="Items you own and moved to the trash. They stay here until you restore or delete them."
    >
      {!loading && items.length === 0 ? (
        <EmptyState title="The trash is empty" icon={IconTrash} />
      ) : (
        <ReactTable
          columns={columns}
          data={items}
          total={total}
          pageIndex={pageIndex}
          pageSize={limit}
        />
      )}
    </SectionCard>
  )
}
