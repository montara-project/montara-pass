import { createFileRoute } from '@tanstack/react-router'

import PasswordGenerator from '@/components/block/tools/password-generator'

export const Route = createFileRoute('/(app)/generator/')({
  component: PasswordGenerator,
})
