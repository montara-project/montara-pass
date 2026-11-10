import { IconClock } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

import { useTimeZone, zoneOffset } from '@/lib/time-zone'
import { cn } from '@/lib/utils'

/**
 * The date and the time, ticking, at the far end of the header, in the zone
 * chosen on the profile (UTC until one is). It is this browser's clock, not
 * the server's, and it says nothing about when a page's data was read; each
 * page stamps that itself.
 */
export default function HeaderClock({ className }: { className?: string }) {
  const zone = useTimeZone()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const format = useMemo(
    () => ({
      date: new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      time: new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }),
    }),
    [zone]
  )

  return (
    <div className={cn('flex shrink-0 items-center gap-2', className)}>
      <time
        dateTime={now.toISOString()}
        title={zone}
        className="bg-background flex h-(--control-h-sm) items-center gap-[7px] rounded-md border px-2.5 font-mono"
      >
        <IconClock aria-hidden className="text-muted-foreground size-3" />
        {/* The date steps aside on a narrow header; the time stays. */}
        <span className="text-muted-foreground hidden text-xs tabular-nums md:inline">
          {format.date.format(now)}
        </span>
        <span className="text-foreground text-xs font-medium tracking-[0.3px] tabular-nums">
          {format.time.format(now)}
        </span>
        <span className="text-muted-foreground text-label tracking-[0.6px]">
          {zoneOffset(zone, now)}
        </span>
      </time>
    </div>
  )
}
