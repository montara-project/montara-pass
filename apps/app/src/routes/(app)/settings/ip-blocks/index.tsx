import { createFileRoute, redirect } from '@tanstack/react-router'

// The IP blocks are a part of Settings' Security tab now; old links land there.
export const Route = createFileRoute('/(app)/settings/ip-blocks/')({
  beforeLoad: () => {
    throw redirect({ to: '/security', replace: true })
  },
})
