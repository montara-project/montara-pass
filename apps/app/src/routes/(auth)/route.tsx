import { createFileRoute, Outlet } from '@tanstack/react-router'

import { redirectIfAuthenticated } from '@/lib/auth/handler'

/** Sign-in and sign-up: a signed-in user is sent home. Each screen lays itself out. */
export const Route = createFileRoute('/(auth)')({
  beforeLoad: () => redirectIfAuthenticated(),
  component: Outlet,
})
