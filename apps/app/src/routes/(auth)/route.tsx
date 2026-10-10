import { createFileRoute, Outlet } from '@tanstack/react-router'

import { redirectIfAuthenticated } from '@/lib/auth/handler'

/** Sign-in and sign-up: a signed-in user is sent home. */
export const Route = createFileRoute('/(auth)')({
  beforeLoad: () => redirectIfAuthenticated(),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  )
}
