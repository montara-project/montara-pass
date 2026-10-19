import { formatDate } from '@montara-pass/shared/date'
import { useQuery } from '@tanstack/react-query'

import Page from '@/components/layout/page'
import { Skeleton } from '@/components/ui/skeleton'
import { queries } from '@/lib/api/queries'

import ChangeMasterPasswordForm from './change-master-password-form'
import TwoFactor from './two-factor'

/** The account: who is signed in, and the password that opens their vault. */
export default function ProfileBlock() {
  const { data, isLoading } = useQuery(queries.auth.profile())
  const user = data?.user

  const rows: [string, string][] = [
    ['Name', user?.name ?? '-'],
    ['Email', user?.email ?? '-'],
    ['Email verified', user?.email_verified ? 'Yes' : 'No'],
    ['Member since', formatDate(user?.created_at)],
  ]

  return (
    <Page title="Account" width="narrow">
      <section aria-labelledby="profile" className="flex flex-col gap-2">
        <h2 id="profile" className="text-muted-foreground pl-1 text-[13px] font-semibold">
          Profile
        </h2>
        {/* Rows in one card, a line between them: a label, and its value at the far end. */}
        <dl className="rounded-card m-0 divide-y overflow-hidden border">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex min-h-[52px] items-center justify-between gap-4 px-4 py-3"
            >
              <dt className="font-medium">{label}</dt>
              <dd className="text-muted-foreground m-0 min-w-0 truncate text-[13px] tabular-nums">
                {isLoading ? <Skeleton className="h-4 w-32" /> : value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <TwoFactor />

      <ChangeMasterPasswordForm />
    </Page>
  )
}
