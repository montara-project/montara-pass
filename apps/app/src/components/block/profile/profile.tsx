import { formatDate } from '@montara-pass/shared/date'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { MONO_NOTE, StatusChip } from '@/components/block/security/section'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

import ChangeMasterPasswordForm from './change-master-password-form'

/** The account: who is signed in, and the password that opens their vault. */
export default function ProfileBlock() {
  const { data, isLoading } = useQuery(queries.auth.profile())
  const user = data?.user
  const totp = data?.totp_enabled

  const emailStatus = user && (
    <StatusChip on={user.email_verified}>
      {user.email_verified ? 'Verified' : 'Not verified'}
    </StatusChip>
  )

  const rows: [string, React.ReactNode][] = [
    ['Name', user?.name || '-'],
    ['Email', user?.email ?? '-'],
    ['Email status', emailStatus],
    ['Member since', formatDate(user?.created_at)],
  ]

  return (
    <div className="mx-auto flex max-w-[720px] flex-col">
      <header className="border-border/60 flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 pt-[22px] pb-[18px] sm:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={MONO_NOTE}>Account · Profile</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Profile</h1>
          <p className="text-muted-foreground text-[13px]">
            Your account details and the master password that unlocks this vault.
          </p>
        </div>
        {user && (
          <p className={cn(MONO_NOTE, 'tabular-nums')}>
            Member since {formatDate(user.created_at)}
          </p>
        )}
      </header>

      <div className="flex flex-col gap-6 px-5 pt-6 pb-8 sm:px-8">
        <section aria-labelledby="profile" className="flex flex-col gap-2.5">
          <h2 id="profile" className={MONO_NOTE}>
            Profile
          </h2>
          {/* Rows in one card, a line between them: a label, and its value at the far end. */}
          <dl className="rounded-card bg-panel divide-border/60 m-0 divide-y overflow-hidden border">
            {rows.map(([label, value]) => (
              <div
                key={label}
                className="flex min-h-[38px] items-center justify-between gap-4 px-4 py-2.5"
              >
                <dt className="text-muted-foreground text-[13px]">{label}</dt>
                <dd className="m-0 min-w-0 truncate text-[13px] font-medium tabular-nums">
                  {isLoading ? <Skeleton className="h-4 w-32" /> : value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="two-step" className="flex flex-col gap-2.5">
          <h2 id="two-step" className={MONO_NOTE}>
            Two-step verification
          </h2>
          {/* Set up and turned off on the Security page; here it is only told. */}
          <div className="rounded-card bg-panel flex items-center gap-3 border px-4 py-3">
            <StatusChip on={totp}>{totp ? 'On' : 'Off'}</StatusChip>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[13px] font-medium">Authenticator app</span>
              <span className="text-muted-foreground text-xs">
                {totp
                  ? 'Signing in asks for a code from your authenticator app.'
                  : 'Not enabled. Sign-in asks for the account password only.'}
              </span>
            </div>
            <Button asChild variant="outline" size="xs">
              <Link to="/security">Manage</Link>
            </Button>
          </div>
        </section>

        <ChangeMasterPasswordForm />
      </div>
    </div>
  )
}
