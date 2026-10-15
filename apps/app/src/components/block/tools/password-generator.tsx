import { IconCopy, IconKey, IconRefresh } from '@tabler/icons-react'
import { useId, useState, type CSSProperties } from 'react'
import { toast } from 'sonner'

import ToolHead from '@/components/layout/tool-head'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  characterKind,
  DEFAULT_PASSWORD_OPTIONS,
  generatePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordBits,
  passwordStrength,
  type PasswordOptions,
} from '@/lib/password'
import { cn } from '@/lib/utils'

type Kind = 'uppercase' | 'lowercase' | 'digits' | 'symbols'

const KINDS: { kind: Kind; label: string; sample: string }[] = [
  { kind: 'uppercase', label: 'Uppercase', sample: 'A-Z' },
  { kind: 'lowercase', label: 'Lowercase', sample: 'a-z' },
  { kind: 'digits', label: 'Numbers', sample: '2-9' },
  { kind: 'symbols', label: 'Symbols', sample: '!@#$' },
]

const STRENGTH = {
  weak: { label: 'Weak', text: 'text-danger', bar: 'bg-danger' },
  fair: { label: 'Fair', text: 'text-warn', bar: 'bg-warn' },
  strong: { label: 'Strong', text: 'text-good', bar: 'bg-good' },
} as const

/** Digits and symbols are tinted, so 5 and S, or l and |, are told apart. */
const CHARACTER = { letter: '', digit: 'text-focus', symbol: 'text-warn' } as const

/** The meter is full at this many bits; beyond it a password is only longer. */
const FULL_BITS = 128

/** However long the password, its characters are all on their way in by now. */
const DRAW_MS = 280
/** The longest one character waits for the one before it. */
const DRAW_STEP_MS = 14

/** Makes random passwords in the browser. Nothing here is saved or sent. */
export default function PasswordGenerator() {
  const lengthId = useId()
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS)
  const [password, setPassword] = useState(() => generatePassword(DEFAULT_PASSWORD_OPTIONS))
  // Counts the passwords asked for by name: each one is drawn in, where one
  // that follows the slider just changes under it.
  const [drawn, setDrawn] = useState(0)

  const regenerate = () => {
    setPassword(generatePassword(options))
    setDrawn((count) => count + 1)
  }

  const change = (next: PasswordOptions) => {
    setOptions(next)
    setPassword(generatePassword(next))
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      toast('Password copied')
    } catch {
      toast.error('Could not copy the password')
    }
  }

  const bits = passwordBits(password)
  const strength = STRENGTH[passwordStrength(password)]
  const chosen = KINDS.filter(({ kind }) => options[kind]).length

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4 p-5 sm:px-8 sm:pb-8">
      <ToolHead
        icon={IconKey}
        title="Password generator"
        description="Made in this browser from random bytes. Nothing is saved."
      />

      {/* The password on one side, what shapes it on the other. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section
          aria-label="Password"
          className="rounded-card bg-card flex flex-col gap-5 border p-5"
        >
          {/* The password has the middle of whatever room the card is given. */}
          <output
            aria-label="Generated password"
            aria-live="polite"
            className="flex min-h-28 flex-1 items-center font-mono text-[26px] leading-normal font-medium break-all select-all"
          >
            {/* One element, so it copies and reads as one word. A new one
                each time it is asked for, so the characters come in again. */}
            <span
              key={drawn}
              className={drawn ? 'ch-drawn' : undefined}
              style={
                {
                  '--step': `${Math.min(DRAW_STEP_MS, DRAW_MS / password.length)}ms`,
                } as CSSProperties
              }
            >
              {[...password].map((char, index) => (
                <span
                  // The position is the identity: characters repeat.
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className={cn('inline-block', CHARACTER[characterKind(char)])}
                  style={{ '--i': index } as CSSProperties}
                >
                  {char}
                </span>
              ))}
            </span>
          </output>

          <div className="flex flex-col gap-3">
            <div className="flex items-center">
              <span className={cn('font-semibold', strength.text)}>{strength.label}</span>
              <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                about {bits} bits
              </span>
            </div>
            <div className="bg-hover h-1.5 overflow-hidden rounded-full" aria-hidden="true">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none',
                  strength.bar
                )}
                style={{ width: `${Math.min(bits / FULL_BITS, 1) * 100}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={regenerate}>
                <IconRefresh />
                Regenerate
              </Button>
              <Button onClick={() => void copy()}>
                <IconCopy />
                Copy
              </Button>
            </div>
          </div>
        </section>

        {/* Rows in one card: the length, then a line to each kind of
            character. No box inside the box. */}
        <section aria-label="Options" className="rounded-card flex flex-col overflow-hidden border">
          <div className="flex flex-col gap-1.5 p-5">
            <div className="flex items-center font-medium">
              <label htmlFor={lengthId}>Length</label>
              <span className="text-muted-foreground ml-auto font-normal">
                {/* Digits of one width, so the line holds still while the slider moves. */}
                <strong className="text-foreground text-[15px] font-semibold tabular-nums">
                  {options.length}
                </strong>{' '}
                characters
              </span>
            </div>
            <input
              id={lengthId}
              className="range"
              type="range"
              min={MIN_PASSWORD_LENGTH}
              max={MAX_PASSWORD_LENGTH}
              value={options.length}
              // How far along the track is filled, which a browser does not say.
              style={
                {
                  '--fill': `${((options.length - MIN_PASSWORD_LENGTH) / (MAX_PASSWORD_LENGTH - MIN_PASSWORD_LENGTH)) * 100}%`,
                } as CSSProperties
              }
              onChange={(e) => change({ ...options, length: Number(e.target.value) })}
            />
            <div className="text-muted-foreground flex text-xs tabular-nums" aria-hidden="true">
              {MIN_PASSWORD_LENGTH}
              <span className="ml-auto">{MAX_PASSWORD_LENGTH}</span>
            </div>
          </div>

          <div className="divide-y border-t">
            {KINDS.map(({ kind, label, sample }) => {
              // A password needs at least one kind of character.
              const last = options[kind] && chosen === 1
              return (
                <label
                  key={kind}
                  className={cn(
                    'flex items-center justify-between gap-3 px-5 py-3.5 font-medium',
                    last ? 'cursor-default' : 'cursor-pointer'
                  )}
                >
                  <span className="flex items-baseline gap-2">
                    {label}
                    <span className="text-muted-foreground font-normal">{sample}</span>
                  </span>
                  <Switch
                    checked={options[kind]}
                    disabled={last}
                    onCheckedChange={(checked) => change({ ...options, [kind]: checked })}
                  />
                </label>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
