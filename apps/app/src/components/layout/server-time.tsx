import { IconClock } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

/** HH:MM:SS of a moment, in UTC. */
const utc = (at: Date) => at.toISOString().slice(11, 19)

/**
 * The header's right end: a live mark and the time in UTC, ticking each
 * second. It is this browser's clock, shown in UTC so it reads the same as the
 * times the server logs. Not announced: a screen reader would hear it tick.
 */
export default function ServerTime({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={cn('hidden items-center gap-2 sm:flex', className)}>
      <span className="bg-good/15 text-good inline-flex h-[18px] items-center gap-1.5 rounded-sm px-2 font-mono text-[10px] font-medium tracking-[0.06em]">
        <span aria-hidden className="size-[5px] rounded-full bg-current" />
        LIVE
      </span>
      <span className="bg-background inline-flex h-7 items-center gap-[7px] rounded-md border px-2.5">
        <IconClock aria-hidden className="text-muted-foreground size-3" />
        <time
          dateTime={now.toISOString()}
          className="font-mono text-xs font-medium tracking-[0.03em] tabular-nums"
        >
          {utc(now)}
        </time>
        <span className="text-muted-foreground font-mono text-[10px] tracking-[0.06em]">UTC</span>
      </span>
    </div>
  )
}
