import { createFileRoute, Outlet } from '@tanstack/react-router'

import VaultGate from '@/components/block/vault/vault-gate'
import SidebarLayout from '@/components/layout/sidebar/layout'
import { requireSession } from '@/lib/auth/handler'

/** Every route under (app) needs a signed-in user and an unlocked vault. */
export const Route = createFileRoute('/(app)')({
  beforeLoad: () => requireSession(),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <SidebarLayout>
      <VaultGate>
        <Outlet />
      </VaultGate>
    </SidebarLayout>
  )
}
