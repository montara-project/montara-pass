import { createFileRoute } from '@tanstack/react-router'

import ProfileBlock from '@/components/block/profile/profile'

export const Route = createFileRoute('/(app)/profile/')({
  component: ProfileBlock,
})
