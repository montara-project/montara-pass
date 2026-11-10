import { initials } from '@montara-pass/shared/string'
import { IconLock } from '@tabler/icons-react'
import { Fragment } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import type { IconType } from './nav-item'

export interface UserMenuAction {
  label: string
  icon: IconType
  onSelect: () => void
  /** Coloured danger, with the wash on hover, under a rule of its own: the way out. */
  destructive?: boolean
}

interface UserMenuProps {
  name?: string | null
  email?: string | null
  /** The pages the sidebar does not hold, then the ways out. */
  actions: readonly UserMenuAction[]
  /** Locks the vault in one click, from a button beside the avatar. */
  onLock?: () => void
  className?: string
}

/**
 * The bar's avatar: who is signed in, and the way out. It sits at the far end
 * of the header, where the admin keeps its own, and opens to the side. With
 * onLock, a lock button stands beside it.
 */
export default function UserMenu({ name, email, actions, onLock, className }: UserMenuProps) {
  const shown = name || email || 'Account'

  return (
    <>
      {onLock && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Lock vault"
              variant="ghost"
              size="icon"
              onClick={onLock}
              className="size-9"
            >
              <IconLock stroke={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Lock vault</TooltipContent>
        </Tooltip>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className={cn(
            'focus-visible:ring-ring shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:outline-none',
            className
          )}
        >
          <span
            aria-hidden="true"
            className="bg-avatar text-avatar-foreground inline-flex size-(--control-h) items-center justify-center rounded-full text-xs font-semibold"
          >
            {initials(shown)}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56" align="end" sideOffset={6}>
          <DropdownMenuLabel className="font-normal">
            <span className="grid gap-0.5 leading-tight">
              <span className="text-foreground truncate text-sm font-semibold">{shown}</span>
              {email && <span className="text-muted-foreground truncate text-xs">{email}</span>}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map(({ label, icon: Icon, onSelect, destructive }) => (
            <Fragment key={label}>
              {destructive && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onSelect={onSelect}
                variant={destructive ? 'destructive' : undefined}
              >
                <Icon />
                {label}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
