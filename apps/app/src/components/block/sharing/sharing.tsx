import type { Models } from '@montara-pass/shared/api/models'
import type { VaultItem } from '@montara-pass/shared/types/vault'

import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import { ITEM_ROLE_OWNER } from '@montara-pass/shared/constants/vault'
import { initials } from '@montara-pass/shared/string'
import { IconDots, IconLayoutGrid, IconShare, IconUsers } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useId, useMemo, useState } from 'react'

import SimpleAlertScrollableDialogForm from '@/components/block/common/simple-alert-scrollable-dialog-form'
import { MONO_NOTE } from '@/components/block/security/section'
import ItemTile, { itemSubtitle } from '@/components/block/vault/item-tile'
import { ShareItemForm } from '@/components/block/vault/share-form'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useAllItems, useSharedItems } from '@/hooks/use-vault'
import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

type SharedItem = VaultItem & { members: Models.ItemMember[] }

/** A count in the line above the list. */
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-background flex h-[26px] items-center gap-2 rounded-md border px-2.5">
      <dt className={MONO_NOTE}>{label}</dt>
      <dd className="m-0 font-mono text-xs font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

/** Who can open an item, as overlapping initials: three at most, then how many more. */
function People({ members }: { members: Models.ItemMember[] }) {
  const shown = members.slice(0, 3)
  return (
    <span
      className="flex -space-x-1.5"
      aria-label={members.map((m) => m.name || m.email).join(', ')}
      role="img"
    >
      {shown.map((member) => (
        <span
          key={member.user_id}
          title={`${member.name || member.email} · ${member.role}`}
          className={cn(
            'ring-panel inline-flex size-6 items-center justify-center rounded-full text-[9px] font-bold ring-2',
            member.role === ITEM_ROLE_OWNER
              ? 'bg-avatar text-avatar-foreground'
              : 'bg-hover text-foreground'
          )}
        >
          {initials(member.name || member.email)}
        </span>
      ))}
      {members.length > shown.length && (
        <span className="bg-hover ring-panel inline-flex size-6 items-center justify-center rounded-full font-mono text-[9px] ring-2">
          +{members.length - shown.length}
        </span>
      )}
    </span>
  )
}

/**
 * The items that are shared, either way: the ones you own and others can
 * open, and the ones others share with you. Each says who can open it and
 * what you may do with it.
 */
export default function Sharing() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useSharedItems()
  const items = useMemo(() => (data ?? []) as SharedItem[], [data])
  // The item whose people are being managed, and the picker for a new share.
  const [managing, setManaging] = useState<VaultItem | null>(null)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState('')
  const [choosing, setChoosing] = useState(false)
  const listId = useId()
  // Only an owner shares; the picker reads the vault once it is opened.
  const vault = useAllItems({ enabled: picking })
  const owned = (vault.data ?? []).filter((item) => item.role === ITEM_ROLE_OWNER && item.secret)

  const { data: profile } = useQuery(queries.auth.profile())
  const meId = profile?.user.id

  // Everyone else who can open your shared items, and the roles they hold.
  const others = useMemo(() => {
    const ids = new Set<string>()
    let editors = 0
    let viewers = 0
    for (const item of items) {
      for (const member of item.members) {
        if (member.user_id === meId) continue
        ids.add(member.user_id)
        if (member.role === 'editor') editors++
        if (member.role === 'viewer') viewers++
      }
    }
    return { people: ids.size, editors, viewers }
  }, [items, meId])

  if (COMMUNITY) {
    return (
      <p className="text-muted-foreground px-8 py-10 text-[13px]">
        The Community Edition has one user, so there is nobody to share with.
      </p>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col">
      <header className="border-border/60 flex flex-wrap items-center gap-x-4 gap-y-3 border-b px-5 pt-[22px] pb-[18px] sm:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={MONO_NOTE}>Vault · Sharing</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Manage sharing</h1>
          <p className="text-muted-foreground text-[13px]">
            Who can open an item, and whether they can only read it or also change it.
          </p>
        </div>
        <Button size="sm" onClick={() => setPicking(true)}>
          <IconShare />
          Share item
        </Button>
      </header>

      <div className="flex flex-col gap-4 px-5 pt-5 pb-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dl className="m-0 flex flex-wrap gap-2">
            <Stat label="Shared items" value={isLoading ? '…' : items.length} />
            <Stat label="People" value={isLoading ? '…' : others.people} />
          </dl>
          <span className={cn(MONO_NOTE, 'tabular-nums')}>
            Editors {others.editors} · viewers {others.viewers}
          </span>
        </div>

        <section aria-labelledby="shared-items" className="flex flex-col gap-2.5">
          <h2 id="shared-items" className={MONO_NOTE}>
            Shared items
          </h2>
          {isLoading ? (
            <Skeleton className="rounded-card h-32" aria-hidden="true" />
          ) : isError ? (
            <p role="alert" className="text-danger text-[13px]">
              The shared items could not be read. Reload the page to try again.
            </p>
          ) : items.length === 0 ? (
            <div className="rounded-card bg-panel fade-in flex flex-col items-center gap-3 border px-6 py-11 text-center">
              <span className="bg-background inline-flex size-11 items-center justify-center rounded-xl border">
                <IconUsers className="size-5" aria-hidden />
              </span>
              <p className="text-[15px] font-semibold">Nothing is shared yet</p>
              <p className="text-muted-foreground max-w-[44ch] text-[13px] text-balance">
                Share an item with someone who has a vault, and it shows here with everyone who can
                open it.
              </p>
              <Button size="sm" className="mt-1" onClick={() => setPicking(true)}>
                <IconShare />
                Share item
              </Button>
            </div>
          ) : (
            <div className="rounded-card bg-panel fade-in overflow-hidden border">
              <ul className="divide-border/60 m-0 list-none divide-y p-0">
                {items.map((item) => {
                  const owner = item.role === ITEM_ROLE_OWNER
                  return (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                      <ItemTile item={item} />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[13px] font-medium">
                          {item.secret?.name ?? 'Unable to decrypt'}
                        </span>
                        <span className={cn(MONO_NOTE, 'truncate normal-case')}>
                          {item.secret ? itemSubtitle(item) : ''}
                        </span>
                      </div>
                      <People members={item.members} />
                      {/* What you may do with it: yours, or the role it was shared with you in. */}
                      <span
                        className={cn(
                          'inline-flex w-[60px] justify-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.08em] uppercase',
                          owner ? 'bg-good/15 text-good' : 'bg-focus/15 text-focus'
                        )}
                      >
                        {item.role}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="icon"
                            className="size-7"
                            aria-label={`More for ${item.secret?.name ?? 'this item'}`}
                          >
                            <IconDots />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-44">
                          {owner && item.secret && (
                            <DropdownMenuItem onClick={() => setManaging(item)}>
                              <IconUsers />
                              Manage access
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              void navigate({ to: '/vault', search: { item: item.id } })
                            }
                          >
                            <IconLayoutGrid />
                            Open in vault
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  )
                })}
              </ul>
              <p className={cn(MONO_NOTE, 'border-border/60 border-t px-4 py-2.5 tabular-nums')}>
                {items.length} shared {items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          )}
          <p className={MONO_NOTE}>
            Viewers read an item · editors can change it too · only its owner shares it
          </p>
        </section>
      </div>

      <SimpleAlertScrollableDialogForm
        open={picking}
        onOpenChange={(open) => {
          setPicking(open)
          if (!open) setPicked('')
        }}
        title="Share an item"
        description="Pick one of your items, then who to share it with."
        confirmText="Continue"
        // One choice to make: the dialog is no wider than it needs.
        size="sm"
        disabled={!picked}
        onSubmit={(e) => {
          e.preventDefault()
          const item = owned.find((i) => i.id === picked)
          if (!item) return
          setPicking(false)
          setPicked('')
          setManaging(item)
        }}
      >
        {vault.isLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : owned.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">
            You have no items of your own to share.
          </p>
        ) : (
          // A combobox: a vault can hold many items, so they are searched by name.
          <Popover open={choosing} onOpenChange={setChoosing}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                mode="input"
                role="combobox"
                placeholder={!picked}
                aria-expanded={choosing}
                aria-controls={listId}
                aria-label="Item to share"
                className="w-full"
              >
                <span className="truncate">
                  {owned.find((item) => item.id === picked)?.secret?.name ?? 'Choose an item'}
                </span>
                <ButtonArrow />
              </Button>
            </PopoverTrigger>
            <PopoverContent id={listId} className="w-(--radix-popper-anchor-width) p-0">
              <Command>
                <CommandInput placeholder="Search your items…" />
                <CommandList>
                  <CommandEmpty>No item matches.</CommandEmpty>
                  <CommandGroup>
                    {owned.map((item) => (
                      <CommandItem
                        key={item.id}
                        // Matched on the name and the line under it, chosen by id.
                        value={item.id}
                        keywords={[item.secret!.name, itemSubtitle(item)]}
                        onSelect={() => {
                          setPicked(item.id)
                          setChoosing(false)
                        }}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{item.secret!.name}</span>
                          <span className="text-muted-foreground truncate text-xs">
                            {itemSubtitle(item)}
                          </span>
                        </span>
                        {picked === item.id && <CommandCheck />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </SimpleAlertScrollableDialogForm>

      {managing && (
        <ShareItemForm
          key={managing.id}
          open
          onOpenChange={(open) => !open && setManaging(null)}
          record={managing}
        />
      )}
    </div>
  )
}
