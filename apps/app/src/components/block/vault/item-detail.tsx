import type { VaultFolder, VaultItem } from '@montara-pass/shared/types/vault'

import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import {
  CARD_FIELDS,
  CONTACT_FIELDS,
  ITEM_ROLE_OWNER,
  ITEM_TYPE_LABEL,
} from '@montara-pass/shared/constants/vault'
import { cardEnding } from '@montara-pass/shared/crypto/vault'
import { linkOf } from '@montara-pass/shared/url'
import {
  IconArrowLeft,
  IconCopy,
  IconDoorExit,
  IconDots,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconPencil,
  IconShare,
  IconStar,
  IconStarFilled,
  IconTrash,
} from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useState } from 'react'
import { toast } from 'sonner'

import SimpleAlertDialog from '@/components/block/common/simple-alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toastApiError } from '@/lib/api/api-error'
import { queries } from '@/lib/api/queries'
import { copySecret } from '@/lib/clipboard'
import { cn } from '@/lib/utils'

import { EditItemForm } from './form'
import ItemTile from './item-tile'
import { ShareItemForm } from './share-form'

// Notes are Markdown, and the renderer is the editor: fetched when a note is
// first shown, and so kept out of the vault's first load.
const MarkdownView = lazy(() =>
  import('@/components/block/common/rich-text-editor').then((module) => ({
    default: module.MarkdownView,
  }))
)

/** Stands for a password that is not shown, whatever its length. */
const MASK = '••••••••••••'

/** When something happened to an item, to the minute: the seconds say nothing. */
const WHEN = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

async function copy(value: string | undefined, label: string) {
  if (!value) {
    toast(`This item has no ${label}`)
    return
  }

  try {
    await copySecret(value)
    toast(`${label[0].toUpperCase()}${label.slice(1)} copied`)
  } catch {
    toast.error(`Could not copy the ${label}`)
  }
}

interface FieldProps {
  label: string
  children: React.ReactNode
  /** Icon buttons at the far end of the row, centered on label and value. */
  actions?: React.ReactNode
  mono?: boolean
}

/** A row of the item's card: a label over its value. Lit under the pointer. */
function Field({ label, children, actions, mono }: FieldProps) {
  return (
    <div className="hover:bg-hover flex items-center gap-1 py-3 pr-3 pl-4 transition-colors duration-[120ms] motion-reduce:transition-none">
      <div className="flex min-w-0 flex-1 flex-col">
        <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
        <dd className={cn('m-0 text-[15px] [overflow-wrap:anywhere]', mono && 'font-mono')}>
          {children}
        </dd>
      </div>
      {actions}
    </div>
  )
}

function IconAction({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string
  pressed?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      variant="ghost"
      mode="icon"
      size="icon"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

const none = <span className="text-muted-foreground">None</span>

/** A card field as shown: a hidden one is masked, a hidden number down to its last four digits. */
function cardFieldText(key: string, value: string, masked: boolean) {
  if (!masked) return value
  if (key === 'number') return cardEnding(value) ?? MASK
  return MASK
}

interface ItemDetailProps {
  item: VaultItem
  folders: VaultFolder[]
  /** Back to the list, where the two take turns. */
  onClose: () => void
}

/** One item, read: its values in a card, and what may be done with it above them. */
export default function ItemDetail({ item, folders, onClose }: ItemDetailProps) {
  // Hidden again for every item: this component is remounted per item.
  const [revealed, setRevealed] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openShare, setOpenShare] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [openLeave, setOpenLeave] = useState(false)

  const { data: profile } = useQuery(queries.auth.profile())
  const placement = useMutation(queries.items.setPlacement(item.id))
  const deleteMutation = useMutation(queries.items.delete())
  const leaveMutation = useMutation(queries.items.removeMember(item.id))

  const secret = item.secret
  const isLogin = item.type === 'login'
  const isNote = item.type === 'secure_note'
  const isOwner = item.role === ITEM_ROLE_OWNER
  const canEdit = item.role !== 'viewer'
  const folder = folders.find((f) => f.id === item.folder_id)
  // A secure note marked not visible stays blurred until it is revealed.
  const noteHidden = isNote && secret?.visible === false && !revealed
  // Only http(s) addresses become links.
  const website = linkOf(secret?.url)

  const toggleFavorite = async () => {
    try {
      await placement.mutateAsync({ folder_id: item.folder_id, favorite: !item.favorite })
    } catch (error) {
      toastApiError(error)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(item.id)
      toast('Item moved to trash')
      onClose()
    } catch (error) {
      toastApiError(error)
    }
  }

  const handleLeave = async () => {
    if (!profile) return

    try {
      await leaveMutation.mutateAsync(profile.user.id)
      toast('You no longer have access to this item')
      onClose()
    } catch (error) {
      toastApiError(error)
    }
  }

  const Star = item.favorite ? IconStarFilled : IconStar

  return (
    <div className="flex max-w-[640px] flex-col gap-4 p-5 sm:px-8 sm:pb-8">
      <Button
        variant="ghost"
        mode="icon"
        size="icon"
        className="-ml-2 hidden @max-[760px]/vault:inline-flex"
        aria-label="All items"
        onClick={onClose}
      >
        <IconArrowLeft />
      </Button>

      <header className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <ItemTile item={item} large />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate text-[22px] font-semibold tracking-[-0.01em]">
            {secret ? secret.name : 'Unable to decrypt'}
          </h2>
          <span className="text-muted-foreground text-[13px]">
            {ITEM_TYPE_LABEL[item.type] ?? item.type}
            {!isOwner && ` · shared with you (${item.role})`}
          </span>
        </div>

        {/* Beside the item's name the buttons are a size down: the name leads. */}
        <div className="flex items-center gap-1">
          <IconAction
            label={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
            pressed={item.favorite}
            onClick={() => void toggleFavorite()}
          >
            <Star className={item.favorite ? 'text-foreground' : undefined} />
          </IconAction>
          {secret && (
            <Button variant="outline" size="sm" onClick={() => setOpenEdit(true)}>
              <IconPencil />
              {/* A viewer may still choose their own folder for the item. */}
              {canEdit ? 'Edit' : 'Folder'}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" mode="icon" size="icon" aria-label="More">
                <IconDots />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              {/* Only the owner hands an item on, or throws it away. */}
              {!COMMUNITY && isOwner && secret && (
                <DropdownMenuItem onClick={() => setOpenShare(true)}>
                  <IconShare />
                  Share
                </DropdownMenuItem>
              )}
              {isOwner ? (
                <DropdownMenuItem variant="destructive" onClick={() => setOpenDelete(true)}>
                  <IconTrash />
                  Move to trash
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant="destructive" onClick={() => setOpenLeave(true)}>
                  <IconDoorExit />
                  Leave
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {!secret ? (
        <p role="alert" className="text-danger text-[13px]">
          This item could not be decrypted. Its key may have changed since the list was loaded:
          reload the page and unlock the vault again.
        </p>
      ) : (
        <dl className="rounded-card bg-card m-0 divide-y overflow-hidden border">
          {isLogin && (
            <>
              <Field
                label="Username"
                actions={
                  <IconAction
                    label="Copy username"
                    onClick={() => void copy(secret.username, 'username')}
                  >
                    <IconCopy />
                  </IconAction>
                }
              >
                {secret.username || none}
              </Field>

              <Field
                label="Password"
                mono={!!secret.password}
                actions={
                  <>
                    <IconAction
                      label={revealed ? 'Hide password' : 'Show password'}
                      pressed={revealed}
                      onClick={() => setRevealed((value) => !value)}
                    >
                      {revealed ? <IconEyeOff /> : <IconEye />}
                    </IconAction>
                    <IconAction
                      label="Copy password"
                      onClick={() => void copy(secret.password, 'password')}
                    >
                      <IconCopy />
                    </IconAction>
                  </>
                }
              >
                {secret.password ? (revealed ? secret.password : MASK) : none}
              </Field>

              <Field
                label="Website"
                actions={
                  website && (
                    <Button variant="ghost" mode="icon" size="icon" asChild>
                      <a
                        href={website}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open website"
                        title="Open website"
                      >
                        <IconExternalLink />
                      </a>
                    </Button>
                  )
                }
              >
                {website ? (
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-focus decoration-focus/40 underline underline-offset-[3px] hover:decoration-current"
                  >
                    {secret.url}
                  </a>
                ) : (
                  secret.url || none
                )}
              </Field>

              {secret.passkey && <Field label="Passkey">Signs in to {secret.passkey.rpId}</Field>}
            </>
          )}

          {item.type === 'contact' &&
            CONTACT_FIELDS.map(({ key, label }) => {
              const value = secret.contact?.[key]
              return (
                <Field
                  key={key}
                  label={label}
                  actions={
                    value && (
                      <IconAction
                        label={`Copy ${label.toLowerCase()}`}
                        onClick={() => void copy(value, label.toLowerCase())}
                      >
                        <IconCopy />
                      </IconAction>
                    )
                  }
                >
                  {value || none}
                </Field>
              )
            })}

          {item.type === 'card' &&
            CARD_FIELDS.map((cardField) => {
              const { key, label } = cardField
              const value = secret.card?.[key]
              const masked = 'secret' in cardField && !revealed
              return (
                <Field
                  key={key}
                  label={label}
                  mono={!!value && 'secret' in cardField}
                  actions={
                    value && (
                      <>
                        {'secret' in cardField && (
                          <IconAction
                            label={
                              revealed
                                ? `Hide ${label.toLowerCase()}`
                                : `Show ${label.toLowerCase()}`
                            }
                            pressed={revealed}
                            onClick={() => setRevealed((shown) => !shown)}
                          >
                            {revealed ? <IconEyeOff /> : <IconEye />}
                          </IconAction>
                        )}
                        <IconAction
                          label={`Copy ${label.toLowerCase()}`}
                          onClick={() => void copy(value, label.toLowerCase())}
                        >
                          <IconCopy />
                        </IconAction>
                      </>
                    )
                  }
                >
                  {/* Hidden, a card number still shows its last four digits. */}
                  {value ? cardFieldText(key, value, masked) : none}
                </Field>
              )
            })}

          {(secret.notes || isNote) && (
            // A note is read, not acted on: the row does not light up.
            // Hidden, the row is tall enough for what it says about itself, however
            // short the note.
            <div className={cn('relative px-4 py-3', noteHidden && 'min-h-[156px]')}>
              <dt className="text-muted-foreground mb-2 text-xs font-medium">Notes</dt>
              {/* Out of reach while blurred: not selectable, not read aloud. Only
                  the top of the note is there: its length would say something too. */}
              <dd
                className={cn(
                  'm-0 text-sm leading-[1.6]',
                  noteHidden && 'max-h-[200px] overflow-hidden opacity-70 blur-[9px] select-none'
                )}
                inert={noteHidden}
                aria-hidden={noteHidden}
              >
                {!secret.notes ? (
                  none
                ) : (
                  // Until the renderer has loaded, the text shows as it is.
                  <Suspense fallback={<span className="whitespace-pre-wrap">{secret.notes}</span>}>
                    <MarkdownView key={secret.notes} value={secret.notes} />
                  </Suspense>
                )}
              </dd>
              {/* Hidden, the note says so itself and offers to be shown. */}
              {noteHidden && (
                <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2 font-medium">
                  <IconEyeOff className="size-5" />
                  <p>This note is hidden.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-panel mt-1"
                    onClick={() => setRevealed(true)}
                  >
                    <IconEye />
                    Show note
                  </Button>
                </div>
              )}
            </div>
          )}
        </dl>
      )}

      {/* Under the card, in line with what the card holds. */}
      <p className="text-muted-foreground pl-[17px] text-xs tabular-nums">
        {folder ? `In ${folder.name} · ` : ''}
        Updated <time dateTime={item.updated_at}>{WHEN.format(new Date(item.updated_at))}</time>
      </p>

      <SimpleAlertDialog
        title="Move this item to the trash?"
        description="Everyone it is shared with loses sight of it. You can restore it from the trash."
        open={openDelete}
        onOpenChange={setOpenDelete}
        onConfirm={handleDelete}
        confirmText="Move to trash"
        variant="destructive"
      />

      <SimpleAlertDialog
        title="Leave this shared item?"
        description="It disappears from your vault. Only its owner can share it with you again."
        open={openLeave}
        onOpenChange={setOpenLeave}
        onConfirm={handleLeave}
        confirmText="Leave"
        variant="destructive"
      />

      {/* Mounted only while open so each opening starts from the current item. */}
      {openEdit && <EditItemForm open={openEdit} onOpenChange={setOpenEdit} record={item} />}
      {openShare && <ShareItemForm open={openShare} onOpenChange={setOpenShare} record={item} />}
    </div>
  )
}
