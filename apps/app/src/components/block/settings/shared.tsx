import type { Models } from '@montara-pass/shared/api/models'
import type { VaultItem } from '@montara-pass/shared/types/vault'

import { ITEM_ROLE_OWNER, ITEM_TYPE_LABEL } from '@montara-pass/shared/constants/vault'
import { IconLink, IconUsers } from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import EmptyState from '@/components/block/common/empty-state'
import SimpleAlertDialog from '@/components/block/common/simple-alert-dialog'
import { MONO_NOTE } from '@/components/block/security/section'
import ItemTile from '@/components/block/vault/item-tile'
import { ShareItemForm } from '@/components/block/vault/share-form'
import { Button } from '@/components/ui/button'
import { useSharedItems } from '@/hooks/use-vault'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

import {
  ListCard,
  ListFooter,
  ListRow,
  ListRows,
  ListSkeleton,
  SettingsSection,
  usePage,
} from './list'

type SharedItem = VaultItem & { members: Models.ItemMember[] }

/** What you may do with an item, named and coloured by how much it allows. */
const ACCESS: Record<string, { label: string; tone: string }> = {
  owner: { label: 'Owner', tone: 'text-good' },
  editor: { label: 'Can edit', tone: 'text-warn' },
  viewer: { label: 'Can view', tone: 'text-focus' },
}

const ROW_BUTTON = 'bg-background h-7 px-2.5 text-xs'

/**
 * The items that are shared, either way, as Settings lists them: who else
 * can open each, what you may do with it, a link to it for the people who
 * can, and the way to change who that is.
 */
export default function Shared() {
  const { data, isLoading, isError } = useSharedItems()
  const items = useMemo(() => (data ?? []) as SharedItem[], [data])
  const { rows, footer } = usePage(items)
  const { data: profile } = useQuery(queries.auth.profile())
  const [managing, setManaging] = useState<VaultItem | null>(null)
  const [leaving, setLeaving] = useState<SharedItem | null>(null)

  // Loading, the error, nothing shared yet, or the rows.
  const renderList = () => {
    if (isLoading) return <ListSkeleton />
    if (isError) {
      return (
        <p role="alert" className="text-danger px-4 py-6 text-[13px]">
          The shared items could not be read. Reload the page to try again.
        </p>
      )
    }
    if (items.length === 0) {
      return (
        <EmptyState
          framed={false}
          icon={IconUsers}
          title="Nothing is shared yet"
          description="Share an item from its detail in the vault, and it shows here with who can open it."
        />
      )
    }
    return (
      <>
        <ListRows>
          {rows.map((item) => {
            const owner = item.role === ITEM_ROLE_OWNER
            const access = ACCESS[item.role] ?? ACCESS.viewer
            return (
              <ListRow
                key={item.id}
                tile={<ItemTile item={item} />}
                name={item.secret?.name ?? 'Unable to decrypt'}
                meta={meta(item, profile?.user.id)}
              >
                <span
                  className={cn(
                    'bg-card hidden h-5 shrink-0 items-center rounded-sm px-2 font-mono text-[10px] font-medium tracking-[0.06em] uppercase sm:inline-flex',
                    access.tone
                  )}
                >
                  {access.label}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  className={ROW_BUTTON}
                  aria-label={`Copy link to ${item.secret?.name ?? 'this item'}`}
                  onClick={() => void copyLink(item.id)}
                >
                  <IconLink className="size-3.5" />
                  <span className="max-sm:sr-only">Copy link</span>
                </Button>
                {owner ? (
                  <Button
                    variant="outline"
                    size="xs"
                    className={ROW_BUTTON}
                    disabled={!item.secret}
                    onClick={() => setManaging(item)}
                  >
                    Manage
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-danger hover:text-danger hover:bg-danger/[0.14] h-7 px-2 text-xs"
                    onClick={() => setLeaving(item)}
                  >
                    Leave
                  </Button>
                )}
              </ListRow>
            )
          })}
        </ListRows>
        <ListFooter label="Shared items" {...footer} />
      </>
    )
  }

  return (
    <SettingsSection
      id="settings-sharing"
      title="Sharing"
      description="Items you share and the ones shared with you. Removing someone re-encrypts the item."
      aside={
        !isLoading && (
          <span className={cn(MONO_NOTE, 'tabular-nums')}>
            {items.length} shared {items.length === 1 ? 'item' : 'items'}
          </span>
        )
      }
    >
      <ListCard>{renderList()}</ListCard>

      {managing && (
        <ShareItemForm
          key={managing.id}
          open
          onOpenChange={(open) => !open && setManaging(null)}
          record={managing}
        />
      )}

      {leaving && profile && (
        <Leave item={leaving} userId={profile.user.id} onDone={() => setLeaving(null)} />
      )}
    </SettingsSection>
  )
}

/** The mono line: the type, then how many others can open it, or who shared it. */
function meta(item: SharedItem, meId: string | undefined) {
  const type = ITEM_TYPE_LABEL[item.type] ?? 'Item'
  if (item.role !== ITEM_ROLE_OWNER) {
    const owner = item.members.find((m) => m.role === ITEM_ROLE_OWNER)
    return owner ? `${type} · Shared by ${owner.name || owner.email}` : type
  }
  const others = item.members.filter((m) => m.user_id !== meId).length
  return `${type} · ${others} ${others === 1 ? 'person' : 'people'}`
}

/** The item's address in the vault: it opens only for someone who can already open the item. */
async function copyLink(id: string) {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/vault?item=${id}`)
    toast.success('Link copied')
  } catch {
    toast.error('The link could not be copied')
  }
}

/** Gives up access to an item someone else shared, after asking. */
function Leave({ item, userId, onDone }: { item: SharedItem; userId: string; onDone: () => void }) {
  const leave = useMutation(queries.items.removeMember(item.id))
  const name = item.secret?.name ?? 'this item'

  const handleLeave = async () => {
    try {
      await leave.mutateAsync(userId)
      toast(`You no longer have access to ${name}`)
      onDone()
    } catch (error) {
      toastApiError(error)
    }
  }

  return (
    <SimpleAlertDialog
      title={`Leave ${name}?`}
      description="It leaves your vault. Its owner has to share it again for you to open it."
      open
      onOpenChange={(open) => !open && onDone()}
      onConfirm={handleLeave}
      confirmText="Leave"
      variant="destructive"
    />
  )
}
