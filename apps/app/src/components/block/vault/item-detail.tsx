import type { VaultFolder, VaultItem } from '@montara-pass/shared/types/vault'

import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import {
  CARD_FIELDS,
  CONTACT_FIELDS,
  ITEM_ROLE_OWNER,
  ITEM_TYPE_LABEL,
} from '@montara-pass/shared/constants/vault'
import { cardEnding } from '@montara-pass/shared/crypto/vault'
import { passwordStrength } from '@montara-pass/shared/password'
import { sharingLabel } from '@montara-pass/shared/sharing'
import { linkOf } from '@montara-pass/shared/url'
import { maskUsername } from '@montara-pass/shared/username'
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconCopy,
  IconDoorExit,
  IconDots,
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
import ItemTile, { itemSubtitle } from './item-tile'
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

/** A row of a section: a label over its value. Lit under the pointer. */
function Field({ label, children, actions, mono }: FieldProps) {
  return (
    <div className="hover:bg-hover flex items-center gap-3 px-3.5 py-[11px] transition-colors duration-[120ms] motion-reduce:transition-none">
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <dt className="text-muted-foreground text-[11px]">{label}</dt>
        <dd
          className={cn(
            'm-0 text-[13px] font-medium [overflow-wrap:anywhere]',
            mono && 'font-mono tracking-[0.02em]'
          )}
        >
          {children}
        </dd>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
    </div>
  )
}

/** A titled card of fields: what it holds, and how many. */
function Section({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section className="rounded-card bg-panel overflow-hidden border">
      <header className="border-border/60 text-muted-foreground flex items-center justify-between border-b px-3.5 py-[9px] font-mono text-[10px] tracking-[0.08em] uppercase">
        <h3 className="font-normal">{title}</h3>
        {count !== undefined && (
          <span>
            {count} {count === 1 ? 'field' : 'fields'}
          </span>
        )}
      </header>
      <dl className="divide-border/60 m-0 divide-y">{children}</dl>
    </section>
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
      className="size-7 [&_svg]:size-3.5!"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

/** How a password's strength is drawn: how many of the four bars it fills. */
const STRENGTH = {
  weak: { label: 'Weak', bars: 1, text: 'text-danger', bar: 'bg-danger' },
  fair: { label: 'Fair', bars: 3, text: 'text-warn', bar: 'bg-warn' },
  strong: { label: 'Strong', bars: 4, text: 'text-good', bar: 'bg-good' },
} as const

function Strength({ password }: { password: string }) {
  const strength = STRENGTH[passwordStrength(password)]
  return (
    <span className="flex items-center gap-2 pt-1.5">
      <span className="flex gap-[3px]" aria-hidden>
        {[1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className={cn(
              'h-[3px] w-[18px] rounded-full',
              bar <= strength.bars ? strength.bar : 'bg-border'
            )}
          />
        ))}
      </span>
      <span
        className={cn(
          'font-mono text-[10px] font-medium tracking-[0.08em] uppercase',
          strength.text
        )}
      >
        {strength.label}
      </span>
    </span>
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
  // The username shows masked, like the list's, until it is asked for.
  const [showUsername, setShowUsername] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openShare, setOpenShare] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [openLeave, setOpenLeave] = useState(false)

  const { data: profile } = useQuery(queries.auth.profile())
  // Who else has it: only the owner may ask, and the Community server never shares.
  const { data: members } = useQuery({
    ...queries.items.members(item.id),
    enabled: item.role === ITEM_ROLE_OWNER && !COMMUNITY,
  })
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
  const updated = WHEN.format(new Date(item.updated_at))
  // The owner counts itself among the members.
  const others = members ? members.data.length - 1 : undefined
  const sharing = sharingLabel(isOwner, others)

  // The note's text, blurred until asked for when the note is marked hidden.
  const noteBody = (
    <>
      {/* A note is read, not acted on: the body does not light up. Hidden,
                  it is tall enough for what it says about itself, however short. */}
      <div
        className={cn(
          'relative',
          isNote ? 'px-[18px] pt-4 pb-3.5' : 'px-3.5 py-3',
          noteHidden && (isNote ? 'min-h-[320px]' : 'min-h-[156px]')
        )}
      >
        {/* Out of reach while blurred: not selectable, not read aloud. Only
                    the top of the note is there: its length would say something too. */}
        <div
          className={cn(
            'text-muted-foreground text-[13px] leading-[1.65]',
            noteHidden && 'max-h-[200px] overflow-hidden opacity-70 blur-[9px] select-none'
          )}
          inert={noteHidden}
          aria-hidden={noteHidden}
        >
          {!secret?.notes ? (
            none
          ) : (
            // Until the renderer has loaded, the text shows as it is.
            <Suspense fallback={<span className="whitespace-pre-wrap">{secret.notes}</span>}>
              <MarkdownView key={secret.notes} value={secret.notes} />
            </Suspense>
          )}
        </div>
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
    </>
  )

  return (
    <div className="flex max-w-[640px] flex-col gap-[18px] px-5 pt-6 pb-5 sm:px-[26px]">
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

      <header className="flex flex-wrap items-center gap-x-3.5 gap-y-3">
        <ItemTile item={item} large />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.09em] uppercase">
            {ITEM_TYPE_LABEL[item.type] ?? item.type}
            {!isOwner && ` · shared with you (${item.role})`}
          </p>
          <h2 className="truncate text-lg font-semibold tracking-[-0.01em]">
            {secret ? secret.name : 'Unable to decrypt'}
          </h2>
          {/* The type is named above: a note says what it is and when it changed. */}
          {secret && (
            <p className="text-muted-foreground truncate text-xs">
              {isNote
                ? `Encrypted note${folder ? ` in ${folder.name}` : ''} · updated ${updated}`
                : itemSubtitle(item)}
            </p>
          )}
        </div>

        {/* Beside the item's name the buttons are a size down: the name leads. */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            mode="icon"
            size="icon"
            className="size-8 [&_svg]:size-4!"
            aria-label={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={item.favorite}
            title={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
            onClick={() => void toggleFavorite()}
          >
            <Star className={item.favorite ? 'text-foreground' : undefined} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                mode="icon"
                size="icon"
                className="size-8 [&_svg]:size-4!"
                aria-label="More"
              >
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
          {secret && (
            <Button size="sm" className="h-8 px-3" onClick={() => setOpenEdit(true)}>
              <IconPencil />
              {/* A viewer may still choose their own folder for the item. */}
              {canEdit ? 'Edit' : 'Folder'}
            </Button>
          )}
        </div>
      </header>

      {!secret ? (
        <p role="alert" className="text-danger text-[13px]">
          This item could not be decrypted. Its key may have changed since the list was loaded:
          reload the page and unlock the vault again.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {isLogin && (
            <Section title="Credentials" count={secret.passkey ? 3 : 2}>
              <Field
                label="Username"
                actions={
                  <>
                    {secret.username && (
                      <IconAction
                        label={showUsername ? 'Hide username' : 'Show username'}
                        pressed={showUsername}
                        onClick={() => setShowUsername((value) => !value)}
                      >
                        {showUsername ? <IconEyeOff /> : <IconEye />}
                      </IconAction>
                    )}
                    <IconAction
                      label="Copy username"
                      onClick={() => void copy(secret.username, 'username')}
                    >
                      <IconCopy />
                    </IconAction>
                  </>
                }
              >
                {secret.username
                  ? showUsername
                    ? secret.username
                    : maskUsername(secret.username)
                  : none}
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
                {secret.password ? (
                  <>
                    {revealed ? secret.password : MASK}
                    <Strength password={secret.password} />
                  </>
                ) : (
                  none
                )}
              </Field>

              {secret.passkey && <Field label="Passkey">Signs in to {secret.passkey.rpId}</Field>}
            </Section>
          )}

          {isLogin && secret.url && (
            <Section title="Website" count={1}>
              <Field
                label="Website"
                mono
                actions={
                  website && (
                    <Button
                      variant="outline"
                      size="xs"
                      className="h-[26px] gap-1 px-2.5 text-xs"
                      asChild
                    >
                      <a href={website} target="_blank" rel="noreferrer">
                        Open
                        <IconArrowUpRight className="text-muted-foreground size-3" />
                      </a>
                    </Button>
                  )
                }
              >
                {secret.url}
              </Field>
            </Section>
          )}

          {item.type === 'contact' && (
            <Section title="Contact" count={CONTACT_FIELDS.length}>
              {CONTACT_FIELDS.map(({ key, label }) => {
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
            </Section>
          )}

          {item.type === 'card' && (
            <Section title="Card" count={CARD_FIELDS.length}>
              {CARD_FIELDS.map((cardField) => {
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
            </Section>
          )}

          {isNote ? (
            <section className="rounded-card bg-panel overflow-hidden border">
              <header className="border-border/60 text-muted-foreground flex items-center justify-between border-b px-3.5 py-[9px] font-mono text-[10px] tracking-[0.08em] uppercase">
                <h3 className="font-normal">Note</h3>
                {/* Hidden, not even its length is told. */}
                <span>{noteHidden ? 'Protected' : `${(secret.notes ?? '').length} chars`}</span>
              </header>
              {noteBody}
              <footer className="border-border/60 text-muted-foreground flex items-center justify-between border-t px-3.5 py-[9px] font-mono text-[10px] tracking-[0.08em] uppercase">
                <span>AES-256 · client side</span>
                {sharing && <span>{sharing}</span>}
              </footer>
            </section>
          ) : (
            secret.notes && (
              <section className="rounded-card bg-panel overflow-hidden border">
                <h3 className="border-border/60 text-muted-foreground border-b px-3.5 py-[9px] font-mono text-[10px] font-normal tracking-[0.08em] uppercase">
                  Notes
                </h3>
                {noteBody}
              </section>
            )
          )}
        </div>
      )}

      {!isNote && (
        <p className="text-muted-foreground font-mono text-[10px] tracking-[0.06em] uppercase tabular-nums">
          {folder ? `In ${folder.name} · ` : ''}
          Updated <time dateTime={item.updated_at}>{updated}</time>
          {sharing && ` · ${sharing}`}
        </p>
      )}

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
