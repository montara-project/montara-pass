import { IconClock } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

const time = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/**
 * The time in UTC, ticking, at the far end of the header: what the API keeps
 * its timestamps in. It is this browser's clock, not the server's, and it says
 * nothing about when a page's data was read; each page stamps that itself.
 */
export default function UtcClock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={cn('flex shrink-0 items-center gap-2', className)}>
      <time
        dateTime={now.toISOString()}
        className="bg-background flex h-(--control-h-sm) items-center gap-[7px] rounded-md border px-2.5 font-mono"
      >
        <IconClock aria-hidden className="text-muted-foreground size-3" />
        <span className="text-foreground text-xs font-medium tracking-[0.3px] tabular-nums">
          {time.format(now)}
        </span>
        <span className="text-muted-foreground text-label tracking-[0.6px]">UTC</span>
      </time>
    </div>
  )
}
