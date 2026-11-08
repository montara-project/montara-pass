import { useQuery } from '@tanstack/react-query'

import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

import AuditLog from './audit-log'
import Devices from './devices'
import Passkeys from './passkeys'
import { MONO_NOTE } from './section'
import TwoFactor from './two-factor'

/** A count in the page head. */
function Stat({ label, value, on }: { label: string; value: React.ReactNode; on?: boolean }) {
  return (
    <div className="bg-background flex h-[30px] items-center gap-2.5 rounded-md border px-2.5">
      <dt className={MONO_NOTE}>{label}</dt>
      <dd className={cn('m-0 font-mono text-[13px] font-semibold tabular-nums', on && 'text-good')}>
        {value}
      </dd>
    </div>
  )
}

/**
 * How the account signs in, where it is signed in, and what happened: the
 * second factor, passkeys, the devices signed in and the activity log.
 */
export default function AccountSecurity() {
  const { data: profile } = useQuery(queries.auth.profile())
  const { data: passkeys } = useQuery(queries.passkeys.list())
  const { data: sessions } = useQuery(queries.sessions.list())
  const totp = profile?.totp_enabled

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col">
      <header className="border-border/60 flex flex-wrap items-center gap-x-4 gap-y-3 border-b px-5 pt-[22px] pb-[18px] sm:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={MONO_NOTE}>Security · Account</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Security</h1>
          <p className="text-muted-foreground text-[13px]">
            How this account signs in, where it is signed in, and what happened.
          </p>
        </div>
        <dl className="m-0 flex flex-wrap items-center gap-2">
          <Stat label="TOTP" value={totp === undefined ? '—' : totp ? 'On' : 'Off'} on={totp} />
          <Stat label="Passkeys" value={passkeys?.length ?? '—'} />
          <Stat label="Sessions" value={sessions?.length ?? '—'} />
        </dl>
      </header>

      <div className="flex flex-col gap-7 px-5 pt-6 pb-8 sm:px-8">
        <TwoFactor />
        <Passkeys />
        <Devices />
        <AuditLog />
      </div>
    </div>
  )
}
