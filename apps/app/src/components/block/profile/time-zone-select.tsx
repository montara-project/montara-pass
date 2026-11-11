import { useMutation } from '@tanstack/react-query'
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
import { toastApiError } from '@/lib/api/api-error'
import { PROFILE_QUERY_KEY } from '@/lib/api/queries/auth'
import { services } from '@/lib/api/services'
import { getQueryClient } from '@/lib/providers/react-query'
import { setTimeZone, timeZones, useTimeZone, zoneOffset } from '@/lib/time-zone'

/** "America/Argentina/Buenos_Aires" as people write it. */
const label = (zone: string) => zone.replaceAll('_', ' ')

/**
 * The zone the header's clock shows, as a combobox: some four hundred zones,
 * so they are searched by city, region or offset. Saved to the account, so
 * the extension's clock shows the same zone.
 */
export default function TimeZoneSelect() {
  const zone = useTimeZone()
  const [open, setOpen] = useState(false)
  const listId = useId()
  const save = useMutation({
    mutationFn: (option: string) => services.security.setTimeZone(option),
    // Shown at once; put back if the account did not take it.
    onMutate: (option) => {
      const previous = zone
      setTimeZone(option)
      return previous
    },
    onSuccess: (_, option) => {
      void getQueryClient().invalidateQueries({ queryKey: [PROFILE_QUERY_KEY] })
      toast.success(`Timezone set to ${label(option)}`)
    },
    onError: (error, _, previous) => {
      if (previous) setTimeZone(previous)
      toastApiError(error)
    },
  })
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
                    setOpen(false)
                    if (option !== zone) save.mutate(option)
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
