import { useQuery } from '@tanstack/react-query'

import SectionCard from '@/components/block/common/section-card'
import { Skeleton } from '@/components/ui/skeleton'
import { queries } from '@/lib/api/queries'
import { formatDate } from '@/lib/date'

import ChangeMasterPasswordForm from './change-master-password-form'

export default function ProfileBlock() {
  const { data, isLoading } = useQuery(queries.auth.profile())

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const user = data?.user

  const rows: [string, string][] = [
    ['Name', user?.name ?? '-'],
    ['Email', user?.email ?? '-'],
    ['Email verified', user?.email_verified ? 'Yes' : 'No'],
    ['Member since', formatDate(user?.created_at)],
  ]

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Profile">
        <dl className="grid gap-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="space-y-1">
              <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {label}
              </dt>
              <dd className="text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      <ChangeMasterPasswordForm />
    </div>
  )
}
