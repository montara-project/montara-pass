import { AuthGuard } from '@/components/block/auth/auth-guard'
import VaultGate from '@/components/block/vault/vault-gate'
import SidebarLayout from '@/components/layout/sidebar/layout'

/** Every route under (app) needs a signed-in user and an unlocked vault. */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard>
      <SidebarLayout>
        <VaultGate>{children}</VaultGate>
      </SidebarLayout>
    </AuthGuard>
  )
}
