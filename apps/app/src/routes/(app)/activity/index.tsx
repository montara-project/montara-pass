import { createFileRoute, redirect } from '@tanstack/react-router'

// The activity log is part of the Security page now; old links land there.
export const Route = createFileRoute('/(app)/activity/')({
  beforeLoad: () => {
    throw redirect({ to: '/security', replace: true })
  },
})
