import type { Models } from '@montara-pass/shared/api/models'

import { deviceName } from '@montara-pass/shared/activity'
import { formatDateTime } from '@montara-pass/shared/date'
import { IconWorld } from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import SimpleAlertDialog from '@/components/block/common/simple-alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

import { MONO_NOTE, Pager, SecuritySection } from './section'

/** Devices to a page. The server sends them all; a page is a slice of them. */
const PAGE_SIZE = 5

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
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (isError) toastApiError(error)
  }, [isError, error])

  const devices = data ?? []
  const others = devices.filter((d) => !d.current).length
  // A sign-out can empty the last page: then the one before it shows.
  const current = Math.min(page, Math.max(0, Math.ceil(devices.length / PAGE_SIZE) - 1))
  const shown = devices.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
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
    <SecuritySection
      id="devices"
      title="Active sessions"
      description="Every device signed in to this account, most recently active first."
    >
      <ul className="divide-border/60 m-0 flex list-none flex-col divide-y p-0">
        {isLoading ? (
          <li className="flex min-h-[56px] items-center px-4 py-3">
            <Skeleton className="h-4 w-48" />
          </li>
        ) : (
          shown.map((device) => (
            <li key={device.id} className="flex items-center gap-3 px-4 py-3">
              <span className="bg-background inline-flex size-8 shrink-0 items-center justify-center rounded-md border">
                <IconWorld className="size-4" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium">{name(device)}</span>
                <span className={cn(MONO_NOTE, 'truncate tabular-nums')}>
                  {[device.ip, device.current ? 'Active now' : formatDateTime(device.updated_at)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              {/* This device signs out the usual way, from the account menu. */}
              {device.current ? (
                <span className="text-good font-mono text-[10px] font-medium tracking-[0.08em] uppercase">
                  This device
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="xs"
                  disabled={busy}
                  onClick={() => setAsking(device)}
                >
                  Revoke
                </Button>
              )}
            </li>
          ))
        )}
      </ul>
      {others > 1 && (
        <div className="border-border/60 border-t px-4 py-3">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setAsking('others')}>
            Sign out of every other device
          </Button>
        </div>
      )}
      {!isLoading && (
        <Pager
          page={current}
          pageSize={PAGE_SIZE}
          shown={shown.length}
          total={devices.length}
          onTurn={setPage}
        />
      )}

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
    </SecuritySection>
  )
}

function name(device: Models.Device): string {
  return deviceName(device.user_agent) || 'Unknown device'
}
