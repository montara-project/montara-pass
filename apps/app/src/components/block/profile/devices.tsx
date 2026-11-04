import type { Models } from '@montara-pass/shared/api/models'

import { deviceName } from '@montara-pass/shared/activity'
import { formatDateTime } from '@montara-pass/shared/date'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import SimpleAlertDialog from '@/components/block/common/simple-alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'

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
  const busy = revoke.isPending || revokeOthers.isPending

  const confirm = async () => {
    const target = asking
    setAsking(null)
    try {
      if (target === 'others') {
        await revokeOthers.mutateAsync()
        toast.success('Signed out of every other device')
      } else if (target) {
        await revoke.mutateAsync(target.id)
        toast.success(`Signed out of ${name(target)}`)
      }
    } catch (err) {
      toastApiError(err)
    }
  }

  return (
    <section aria-labelledby="devices" className="flex flex-col gap-2">
      <h2 id="devices" className="text-muted-foreground pl-1 text-[13px] font-semibold">
        Signed-in devices
      </h2>
      <div className="rounded-card flex flex-col border">
        <ul className="m-0 flex list-none flex-col divide-y p-0">
          {isLoading ? (
            <li className="flex min-h-[60px] items-center px-4 py-3">
              <Skeleton className="h-4 w-48" />
            </li>
          ) : (
            devices.map((device) => (
              <li
                key={device.id}
                className="flex min-h-[60px] items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="truncate">{name(device)}</span>
                    {device.current && (
                      <span className="text-primary shrink-0 rounded-full border px-2 py-0.5 text-[11px]">
                        This device
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground truncate text-[13px] tabular-nums">
                    {[device.ip, `Last active ${formatDateTime(device.updated_at)}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                {!device.current && (
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={busy}
                    onClick={() => setAsking(device)}
                  >
                    Sign out
                  </Button>
                )}
              </li>
            ))
          )}
        </ul>
        {others > 1 && (
          <div className="border-t px-4 py-3">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setAsking('others')}>
              Sign out of every other device
            </Button>
          </div>
        )}
      </div>

      <SimpleAlertDialog
        title={
          asking === 'others'
            ? 'Sign out of every other device?'
            : `Sign out of ${asking ? name(asking) : 'this device'}?`
        }
        description="It is signed out at once and needs your password to sign in again. If you think someone else knows your password, change it too."
        open={asking !== null}
        onOpenChange={(open) => !open && setAsking(null)}
        onConfirm={() => void confirm()}
        confirmText="Sign out"
      />
    </section>
  )
}

function name(device: Models.Device): string {
  return deviceName(device.user_agent) || 'Unknown device'
}
