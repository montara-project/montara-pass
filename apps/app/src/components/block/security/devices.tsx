import type { Models } from '@montara-pass/shared/api/models'

import { deviceName } from '@montara-pass/shared/activity'
import { IconDeviceDesktop, IconDeviceMobile } from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import SimpleAlertDialog from '@/components/block/common/simple-alert-dialog'
import {
  ListCard,
  ListFooter,
  ListRow,
  ListRows,
  ListSkeleton,
  SettingsSection,
  usePage,
} from '@/components/block/settings/list'
import { Button } from '@/components/ui/button'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

import { Chip, MONO_NOTE } from './section'

const AGO = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

/** "Active 2 hours ago": when the session was last renewed, in words. */
function activeAgo(updatedAt: string) {
  const minutes = Math.round((Date.parse(updatedAt) - Date.now()) / 60_000)
  if (minutes > -1) return 'Active now'
  if (minutes > -60) return `Active ${AGO.format(minutes, 'minute')}`
  const hours = Math.round(minutes / 60)
  if (hours > -24) return `Active ${AGO.format(hours, 'hour')}`
  return `Active ${AGO.format(Math.round(hours / 24), 'day')}`
}

/**
 * The devices signed in to the account, the most recently active first, and
 * signing them out: one that is lost, or a sign-in the user does not know.
 * This device signs out the usual way, from the account menu.
 */
export default function Devices() {
  const { data, isLoading, isError, error } = useQuery(queries.sessions.list())
  const revoke = useMutation(queries.sessions.revoke())
  const revokeOthers = useMutation(queries.sessions.revokeOthers())
  // The device to sign out, or every other one, while it is being confirmed.
  const [asking, setAsking] = useState<Models.Device | 'others' | null>(null)

  useEffect(() => {
    if (isError) toastApiError(error)
  }, [isError, error])

  const devices = data ?? []
  const others = devices.filter((d) => !d.current).length
  const { rows, footer } = usePage(devices)
  const busy = revoke.isPending || revokeOthers.isPending

  const confirm = async () => {
    const target = asking
    setAsking(null)
    if (!target) return
    try {
      if (target === 'others') {
        await revokeOthers.mutateAsync()
        toast.success('Signed out of every other device')
        return
      }
      await revoke.mutateAsync(target.id)
      toast.success(`Signed out of ${name(target)}`)
    } catch (err) {
      toastApiError(err)
    }
  }

  return (
    <SettingsSection
      id="devices"
      title="Active sessions"
      description="Every device signed in to this account. Revoking one signs that device out at once."
      aside={
        !isLoading && (
          <div className="flex items-center gap-3">
            {others > 1 && (
              <Button
                variant="outline"
                size="xs"
                className="bg-card h-7 px-2.5 text-xs"
                disabled={busy}
                onClick={() => setAsking('others')}
              >
                Sign out of every other device
              </Button>
            )}
            <span className={cn(MONO_NOTE, 'tabular-nums')}>{devices.length} active</span>
          </div>
        )
      }
    >
      <ListCard>
        {isLoading ? (
          <ListSkeleton />
        ) : (
          <>
            <ListRows>
              {rows.map((device) => {
                const Icon = /mobile|iphone|android/i.test(device.user_agent ?? '')
                  ? IconDeviceMobile
                  : IconDeviceDesktop
                return (
                  <ListRow
                    key={device.id}
                    tile={
                      <span
                        className={cn(
                          'bg-background inline-flex size-[30px] shrink-0 items-center justify-center rounded-md border',
                          device.current ? 'text-good' : 'text-muted-foreground'
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                    }
                    name={name(device)}
                    meta={[
                      device.ip,
                      device.current ? 'Current session' : activeAgo(device.updated_at),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  >
                    <span className="hidden sm:inline-flex">
                      <Chip on={device.current}>
                        {device.current ? 'This device' : 'Signed in'}
                      </Chip>
                    </span>
                    {/* This device signs out the usual way, from the account menu. */}
                    {!device.current && (
                      <Button
                        variant="outline"
                        size="xs"
                        className="bg-card h-7 px-2.5 text-xs"
                        disabled={busy}
                        onClick={() => setAsking(device)}
                      >
                        Revoke
                      </Button>
                    )}
                  </ListRow>
                )
              })}
            </ListRows>
            <ListFooter label="Sessions" {...footer} />
          </>
        )}
      </ListCard>

      <SimpleAlertDialog
        title={
          asking === 'others'
            ? 'Sign out of every other device?'
            : `Sign out of ${asking ? name(asking) : 'this device'}?`
        }
        description="It is signed out at once. It can sign in again with your password or one of your passkeys: if someone else may have either, change your password and remove the passkeys you don't recognize."
        open={asking !== null}
        onOpenChange={(open) => !open && setAsking(null)}
        onConfirm={() => void confirm()}
        confirmText="Sign out"
      />
    </SettingsSection>
  )
}

function name(device: Models.Device): string {
  return deviceName(device.user_agent) || 'Unknown device'
}
