import { useId, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button, ButtonArrow } from '@/components/ui/button'
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { setTimeZone, timeZones, useTimeZone, zoneOffset } from '@/lib/time-zone'

/** "America/Argentina/Buenos_Aires" as people write it. */
const label = (zone: string) => zone.replaceAll('_', ' ')

/**
 * The zone the header's clock shows, as a combobox: some four hundred zones,
 * so they are searched by city, region or offset. Kept in this browser.
 */
export default function TimeZoneSelect() {
  const zone = useTimeZone()
  const [open, setOpen] = useState(false)
  const listId = useId()
  // Offsets read now: a zone in daylight saving shows the one it has today.
  const zones = useMemo(
    () => (open ? timeZones().map((z) => ({ zone: z, offset: zoneOffset(z) })) : []),
    [open]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          mode="input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label="Timezone"
          className="w-full sm:w-[340px]"
        >
          <span className="truncate">{label(zone)}</span>
          {zoneOffset(zone) !== zone && (
            <span className="text-muted-foreground ml-auto shrink-0 font-mono text-xs">
              {zoneOffset(zone)}
            </span>
          )}
          <ButtonArrow />
        </Button>
      </PopoverTrigger>
      <PopoverContent id={listId} align="end" className="w-(--radix-popper-anchor-width) p-0">
        <Command>
          <CommandInput placeholder="Search a city or an offset…" />
          <CommandList>
            <CommandEmpty>No timezone matches.</CommandEmpty>
            <CommandGroup>
              {zones.map(({ zone: option, offset }) => (
                <CommandItem
                  key={option}
                  value={option}
                  keywords={[label(option), offset]}
                  onSelect={() => {
                    setTimeZone(option)
                    setOpen(false)
                    toast.success(`Timezone set to ${label(option)}`)
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{label(option)}</span>
                  {/* UTC needs no offset beside its name. */}
                  {offset !== option && (
                    <span className="text-muted-foreground shrink-0 font-mono text-xs">
                      {offset}
                    </span>
                  )}
                  {option === zone && <CommandCheck />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
