import { createFileRoute, Outlet } from '@tanstack/react-router'

import VaultGate from '@/components/block/vault/vault-gate'
import Shell from '@/components/layout/shell'
import { requireSession } from '@/lib/auth/handler'

/**
 * Every route under (app) needs a signed-in user and an unlocked vault. The
 * gate stands outside the shell: locked, there is nowhere in it to go.
 */
export const Route = createFileRoute('/(app)')({
  beforeLoad: () => requireSession(),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <VaultGate>
      <Shell>
        <Outlet />
      </Shell>
    </VaultGate>
  )
}
