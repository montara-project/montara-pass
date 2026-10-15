import { IconKey, IconLogin2 } from '@tabler/icons-react'
import { Link, useSearch } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { SIGN_IN_PATH } from '@/lib/constants/auth'

import AuthShell from './auth-shell'

// What is left between a verified address and an open vault, in order.
const NEXT = [
  {
    icon: IconLogin2,
    title: 'Sign in with your account password',
    note: 'The one you chose when you created the account.',
  },
  {
    icon: IconKey,
    title: 'Create the vault',
    note: 'Choose a master password. It is separate from your account password and never reaches the server.',
  },
]

/** Where the link in the verification email lands once the API has accepted it. */
export default function EmailVerified() {
  const { verified } = useSearch({ from: '/(auth)/verify-email/' })

  // Reached without the API's redirect: nothing was verified here.
  if (!verified) {
    return (
      <AuthShell
        title="Verify your email"
        note="Open the link in the verification email to confirm your address."
      >
        <Button asChild size="lg" className="mt-1.5 w-full">
          <Link to={SIGN_IN_PATH} replace>
            Sign in
          </Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Email verified" note="Your email address is confirmed. Two steps are left.">
      <ol className="rounded-card bg-card divide-y border">
        {NEXT.map(({ icon: Icon, title, note }) => (
          <li key={title} className="flex items-start gap-3 p-3">
            <span className="rounded-control bg-background text-muted-foreground grid size-9 shrink-0 place-items-center">
              <Icon className="size-5" stroke={2} aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 pt-px">
              <p className="text-[15px] leading-snug font-medium tracking-[-0.005em]">{title}</p>
              <p className="text-muted-foreground text-[13px] leading-snug">{note}</p>
            </div>
          </li>
        ))}
      </ol>

      <Button asChild size="lg" className="mt-1.5 w-full">
        <Link to={SIGN_IN_PATH} replace>
          Sign in
        </Link>
      </Button>
    </AuthShell>
  )
}
