import { initials } from '@montara-pass/shared/string'
import {
  IconCircleCheck,
  IconInfoCircle,
  IconMail,
  IconMailForward,
  IconUser,
  IconWorld,
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { MONO_NOTE } from '@/components/block/security/section'
import SettingsFrame from '@/components/block/settings/frame'
import { SettingsSection } from '@/components/block/settings/list'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { requestPasswordReset } from '@/lib/auth/email-auth'
import { cn } from '@/lib/utils'

import ChangeMasterPasswordForm from './change-master-password-form'
import TimeZoneSelect from './time-zone-select'

/** "Jan 2026": when the account was made, to the month. */
const SINCE = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' })

/**
 * Settings' Profile tab: who is signed in, the account password that signs
 * them in, and the master password that opens their vault.
 */
export default function ProfileBlock() {
  const { data, isLoading } = useQuery(queries.auth.profile())
  const { data: role } = useQuery(queries.security.role())
  const user = data?.user
  const admin = role?.role === 'super_user'
  const name = user?.name || user?.email || 'Account'

  const details: { label: string; icon: typeof IconUser; value: React.ReactNode }[] = [
    { label: 'Full name', icon: IconUser, value: user?.name || '—' },
    { label: 'Email address', icon: IconMail, value: user?.email ?? '—' },
    { label: 'Timezone', icon: IconWorld, value: <TimeZoneSelect /> },
    {
      label: 'Email status',
      icon: IconCircleCheck,
      value: user && (
        <span
          className={cn(
            'inline-flex h-[22px] items-center gap-1.5 rounded-sm px-2 font-mono text-[10px] font-medium tracking-[0.06em] uppercase',
            user.email_verified ? 'bg-good/15 text-good' : 'bg-card text-muted-foreground'
          )}
        >
          {user.email_verified && <IconCircleCheck className="size-3" aria-hidden />}
          {user.email_verified ? 'Verified' : 'Not verified'}
        </span>
      ),
    },
  ]

  return (
    <SettingsFrame>
      <SettingsSection
        id="profile-account"
        title="Account profile"
        description="The name and address shown on every sign-in and every audit row."
        aside={role && <span className={MONO_NOTE}>Signed in as {admin ? 'admin' : 'member'}</span>}
      >
        <div className="rounded-card bg-panel fade-in overflow-hidden border">
          {/* Who is signed in, at a glance. */}
          <div className="border-border/60 flex items-center gap-3.5 border-b px-[18px] py-4">
            <span
              aria-hidden="true"
              className="bg-avatar text-avatar-foreground inline-flex size-[52px] shrink-0 items-center justify-center rounded-full text-base font-semibold tracking-[0.02em]"
            >
              {initials(name)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3.5 w-48" />
                </>
              ) : (
                <>
                  <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                    {name}
                  </span>
                  <span className="text-muted-foreground truncate text-[13px]" title={user?.email}>
                    {user?.email}
                  </span>
                </>
              )}
              <span className="flex flex-wrap items-center gap-2">
                {role && (
                  <span
                    className={cn(
                      'bg-card rounded-[5px] px-[7px] py-0.5 font-mono text-[10px] font-medium tracking-[0.06em] uppercase',
                      admin ? 'text-focus' : 'text-muted-foreground'
                    )}
                  >
                    {admin ? 'Admin' : 'Member'}
                  </span>
                )}
                {user && (
                  <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.04em]">
                    · Member since {SINCE.format(new Date(user.created_at))}
                  </span>
                )}
              </span>
            </div>
          </div>

          <p className={cn(MONO_NOTE, 'px-[18px] pt-3.5 pb-1.5')}>Personal details</p>
          {/* Read here only: the API has no way to change them yet. */}
          <dl className="divide-border/60 m-0 divide-y">
            {details.map(({ label, icon: Icon, value }) => (
              <div
                key={label}
                className="flex min-h-[52px] items-center justify-between gap-4 px-[18px] py-2.5"
              >
                <dt className="text-muted-foreground flex items-center gap-2 text-[13px]">
                  <Icon className="size-3.5 shrink-0" aria-hidden />
                  {label}
                </dt>
                <dd
                  // Text is cut short with the full value on hover; a control keeps its own box.
                  className={cn(
                    'm-0 min-w-0 text-right text-[13px] font-medium',
                    typeof value === 'string' && 'truncate'
                  )}
                  title={typeof value === 'string' ? value : undefined}
                >
                  {isLoading && typeof value === 'string' ? (
                    <Skeleton className="h-4 w-32" />
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-subtle-foreground border-border/60 flex items-center gap-1.5 border-t px-[18px] py-3 text-xs">
            <IconInfoCircle className="size-3 shrink-0" aria-hidden />
            The timezone is kept in this browser; the clock in the header shows it.
          </p>
        </div>
      </SettingsSection>

      <AccountPassword email={user?.email} />

      <ChangeMasterPasswordForm />
    </SettingsFrame>
  )
}

/**
 * The account password, the one that signs in. It is changed through a link
 * sent to the account's address, as when it is forgotten.
 */
function AccountPassword({ email }: { email?: string }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const send = async () => {
    if (!email) return
    setSending(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
      toast.success('Reset link sent')
    } catch (error) {
      toastApiError(error)
    } finally {
      setSending(false)
    }
  }

  return (
    <SettingsSection
      id="profile-password"
      title="Password"
      description="The account password signs you in. Your master password stays separate."
    >
      <div className="rounded-card bg-panel flex flex-wrap items-center gap-x-4 gap-y-3 border p-4">
        <p className="text-muted-foreground min-w-0 flex-1 basis-64 text-[13px]" aria-live="polite">
          {sent
            ? `A link to set a new password is on its way to ${email}.`
            : 'Change it through a link sent to your email address, the same way as when it is forgotten.'}
        </p>
        <Button size="sm" disabled={!email || sending} onClick={() => void send()}>
          <IconMailForward />
          {sending ? 'Sending…' : sent ? 'Send again' : 'Email me a reset link'}
        </Button>
      </div>
    </SettingsSection>
  )
}
