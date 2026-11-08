import {
  characterKind,
  DEFAULT_PASSWORD_OPTIONS,
  generatePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordBits,
  passwordStrength,
  type PasswordOptions,
} from '@montara-pass/shared/password'
import { IconCopy, IconRefresh } from '@tabler/icons-react'
import { useId, useState, type CSSProperties } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { copySecret } from '@/lib/clipboard'
import { cn } from '@/lib/utils'

type Kind = 'uppercase' | 'lowercase' | 'digits' | 'symbols'

const KINDS: { kind: Kind; label: string; sample: string }[] = [
  { kind: 'uppercase', label: 'Uppercase', sample: 'A-Z' },
  { kind: 'lowercase', label: 'Lowercase', sample: 'a-z' },
  { kind: 'digits', label: 'Numbers', sample: '0-9' },
  { kind: 'symbols', label: 'Symbols', sample: '!@#' },
]

/** How a strength is drawn: its color, and how many of the four bars it fills. */
const STRENGTH = {
  weak: { label: 'Weak', bars: 1, text: 'text-danger', bar: 'bg-danger' },
  fair: { label: 'Fair', bars: 3, text: 'text-warn', bar: 'bg-warn' },
  strong: { label: 'Strong', bars: 4, text: 'text-good', bar: 'bg-good' },
} as const

/** A card's title line: what it holds on the left, a count on the right. */
const CARD_HEAD =
  'border-border/60 text-muted-foreground flex items-center justify-between border-b px-4 font-mono text-[10px] tracking-[0.08em] uppercase'
const MONO_NOTE = 'text-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase'

/** Digits and symbols are tinted, so 5 and S, or l and |, are told apart. */
const CHARACTER = { letter: '', digit: 'text-focus', symbol: 'text-warn' } as const

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
      await copySecret(password)
      toast('Password copied')
    } catch {
      toast.error('Could not copy the password')
    }
  }

  const bits = passwordBits(password)
  const strength = STRENGTH[passwordStrength(password)]
  const chosen = KINDS.filter(({ kind }) => options[kind]).length

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col">
      <header className="border-border/60 flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 pt-[22px] pb-[18px] sm:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={MONO_NOTE}>Tools</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Password generator</h1>
          <p className="text-muted-foreground text-[13px]">
            Made in this browser from random bytes. Nothing is saved.
          </p>
        </div>
        <p className={MONO_NOTE}>Client side · no storage</p>
      </header>

      {/* The password and its length on one side, what it is made of on the other. */}
      <div className="grid items-start gap-[18px] px-5 pt-6 pb-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-[18px]">
          <section aria-label="Password" className="rounded-card bg-panel overflow-hidden border">
            <h2 className={cn(CARD_HEAD, 'py-[9px] font-normal')}>
              Generated password
              <span>{password.length} chars</span>
            </h2>

            {/* The password has the middle of whatever room the card is given. */}
            <output
              aria-label="Generated password"
              aria-live="polite"
              className="flex min-h-[66px] items-center px-4 py-[18px] font-mono text-[23px] leading-[1.3] font-medium tracking-[0.02em] break-all select-all"
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

            <div className="flex flex-col gap-[9px] px-4 pb-4">
              <div className="flex items-center font-mono text-[10px] tracking-[0.08em] uppercase">
                <span className={cn('font-medium', strength.text)}>{strength.label}</span>
                <span className="text-muted-foreground ml-auto tabular-nums">
                  about {bits} bits
                </span>
              </div>
              <div className="flex gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((bar) => (
                  <span
                    key={bar}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none',
                      bar <= strength.bars ? strength.bar : 'bg-border'
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="border-border/60 flex flex-wrap items-center gap-2 border-t px-4 py-3">
              <Button variant="secondary" size="sm" className="border" onClick={regenerate}>
                <IconRefresh />
                Regenerate
              </Button>
              <Button size="sm" onClick={() => void copy()}>
                <IconCopy />
                Copy
              </Button>
              <span className={cn(MONO_NOTE, 'ml-auto')}>Never stored</span>
            </div>
          </section>

          <section aria-label="Length" className="rounded-card bg-panel overflow-hidden border">
            <div className="border-border/60 flex items-center border-b px-4 py-3">
              <label htmlFor={lengthId} className="text-muted-foreground text-[13px] font-medium">
                Length
              </label>
              {/* Digits of one width, so the box holds still while the slider moves. */}
              <span className="bg-background ml-auto inline-flex h-[26px] min-w-[34px] items-center justify-center rounded-sm border px-2 font-mono text-xs font-medium tabular-nums">
                {options.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 px-4 pt-4 pb-3.5">
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
              <div className={cn(MONO_NOTE, 'flex tabular-nums')} aria-hidden="true">
                {MIN_PASSWORD_LENGTH}
                <span className="ml-auto">{MAX_PASSWORD_LENGTH}</span>
              </div>
            </div>
          </section>
        </div>

        <section
          aria-label="Character set"
          className="rounded-card bg-panel overflow-hidden border"
        >
          <h2 className={cn(CARD_HEAD, 'py-3 font-normal')}>
            Character set
            <span>
              {chosen} of {KINDS.length} on
            </span>
          </h2>
          <div className="divide-border/60 divide-y">
            {KINDS.map(({ kind, label, sample }) => {
              // A password needs at least one kind of character.
              const last = options[kind] && chosen === 1
              return (
                <label
                  key={kind}
                  htmlFor={`${lengthId}-${kind}`}
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-3',
                    last ? 'cursor-default' : 'cursor-pointer'
                  )}
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium">{label}</span>
                    <span className="text-muted-foreground font-mono text-[11px] tracking-[0.04em]">
                      {kind === 'digits' && !options.ambiguous ? '2-9' : sample}
                    </span>
                  </span>
                  <Switch
                    id={`${lengthId}-${kind}`}
                    checked={options[kind]}
                    disabled={last}
                    onCheckedChange={(checked) => change({ ...options, [kind]: checked })}
                  />
                </label>
              )
            })}
            {/* 0 and O, 1, l and I: left out unless asked for, as one is easily
                read for another. */}
            <label
              htmlFor={`${lengthId}-ambiguous`}
              className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3"
            >
              <span className="text-muted-foreground text-[13px]">Include ambiguous</span>
              <Switch
                id={`${lengthId}-ambiguous`}
                checked={options.ambiguous}
                onCheckedChange={(checked) => change({ ...options, ambiguous: checked })}
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  )
}
