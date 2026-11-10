import { useQuery } from '@tanstack/react-query'

import SettingsFrame from '@/components/block/settings/frame'
import { queries } from '@/lib/api/queries'

import AuditLog from './audit-log'
import Devices from './devices'
import { IpBlockSection } from './ip-blocks'
import Passkeys from './passkeys'
import TwoFactor from './two-factor'

/**
 * Settings' Security tab: how the account signs in, where it is signed in,
 * and what happened: the second factor and passkeys, the devices signed in,
 * the activity log, and for the super user the IP blocks.
 */
export default function AccountSecurity() {
  const { data: role } = useQuery(queries.security.role())

  return (
    <SettingsFrame>
      {/* The two ways to sign in, side by side; one being set up takes the row. */}
      <div className="grid gap-4 md:grid-cols-2">
        <TwoFactor />
        <Passkeys />
      </div>
      <Devices />
      <AuditLog />
      {role?.role === 'super_user' && <IpBlockSection />}
    </SettingsFrame>
  )
}
