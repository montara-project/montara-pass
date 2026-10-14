import { Switch as SwitchPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-foreground/[0.26] inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-150 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-primary-foreground pointer-events-none block size-[18px] rounded-full transition-transform duration-150 motion-reduce:transition-none data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
