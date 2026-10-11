import { IconCopy, IconRefresh } from '@tabler/icons-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import SectionCard from '@/components/block/common/section-card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
  weak: { label: 'Weak', text: 'text-destructive', bar: 'bg-destructive' },
  fair: { label: 'Fair', text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' },
  strong: {
    label: 'Strong',
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
} as const

/** Digits and symbols are tinted, so 5 and S, or l and |, are told apart. */
const CHARACTER = {
  letter: '',
  digit: 'text-primary',
  symbol: 'text-amber-600 dark:text-amber-400',
} as const

/** The meter is full at this many bits; beyond it a password is only longer. */
const FULL_BITS = 128

/** Makes random passwords in the browser. Nothing here is saved or sent. */
export default function PasswordGenerator() {
  const lengthId = useId()
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS)
  const [password, setPassword] = useState(() => generatePassword(DEFAULT_PASSWORD_OPTIONS))

  const change = (next: PasswordOptions) => {
    setOptions(next)
    setPassword(generatePassword(next))
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      toast.success('Password copied')
    } catch {
      toast.error('Could not copy the password')
    }
  }

  const bits = passwordBits(password)
  const strength = STRENGTH[passwordStrength(password)]
  const chosen = KINDS.filter(({ kind }) => options[kind]).length

  return (
    <SectionCard
      title="Password Generator"
      description="Made in your browser from random bytes. Nothing is saved or sent."
    >
      {/* The password on one side, what shapes it on the other. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section
          aria-label="Password"
          className="bg-muted/40 flex flex-col justify-between gap-6 rounded-lg border p-5 sm:p-6"
        >
          <output
            aria-label="Generated password"
            aria-live="polite"
            className="flex min-h-28 items-center font-mono text-2xl leading-relaxed font-medium break-all select-all sm:text-3xl"
          >
            {/* One element, so it copies and reads as one word. */}
            <span>
              {[...password].map((char, index) => (
                // The position is the identity: characters repeat.
                // eslint-disable-next-line react/no-array-index-key
                <span key={index} className={CHARACTER[characterKind(char)]}>
                  {char}
                </span>
              ))}
            </span>
          </output>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className={cn('font-semibold', strength.text)}>{strength.label}</span>
                <span className="text-muted-foreground tabular-nums">about {bits} bits</span>
              </div>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none',
                    strength.bar
                  )}
                  style={{ width: `${Math.min(bits / FULL_BITS, 1) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setPassword(generatePassword(options))}>
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

        <section aria-label="Options" className="flex flex-col gap-5 rounded-lg border p-5 sm:p-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <Label htmlFor={lengthId}>Length</Label>
              <span className="text-sm tabular-nums">
                <span className="text-lg font-semibold">{options.length}</span> characters
              </span>
            </div>
            <input
              id={lengthId}
              type="range"
              min={MIN_PASSWORD_LENGTH}
              max={MAX_PASSWORD_LENGTH}
              value={options.length}
              onChange={(e) => change({ ...options, length: Number(e.target.value) })}
              className="accent-primary w-full cursor-pointer"
            />
            <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
              <span>{MIN_PASSWORD_LENGTH}</span>
              <span>{MAX_PASSWORD_LENGTH}</span>
            </div>
          </div>

          <div className="flex flex-col divide-y rounded-lg border">
            {KINDS.map(({ kind, label, sample }) => (
              <label
                key={kind}
                htmlFor={`${lengthId}-${kind}`}
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3"
              >
                <span className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-muted-foreground font-mono text-xs">{sample}</span>
                </span>
                <Switch
                  id={`${lengthId}-${kind}`}
                  checked={options[kind]}
                  // A password needs at least one kind of character.
                  disabled={options[kind] && chosen === 1}
                  onCheckedChange={(checked) => change({ ...options, [kind]: checked })}
                />
              </label>
            ))}
          </div>
        </section>
      </div>
    </SectionCard>
  )
}
