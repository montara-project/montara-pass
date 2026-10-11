import { IconCopy, IconRefresh } from '@tabler/icons-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import SectionCard from '@/components/block/common/section-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  DEFAULT_PASSWORD_OPTIONS,
  generatePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordStrength,
  type PasswordOptions,
} from '@/lib/password'

type Kind = 'uppercase' | 'lowercase' | 'digits' | 'symbols'

const KINDS: { kind: Kind; label: string; sample: string }[] = [
  { kind: 'uppercase', label: 'Uppercase', sample: 'A-Z' },
  { kind: 'lowercase', label: 'Lowercase', sample: 'a-z' },
  { kind: 'digits', label: 'Numbers', sample: '2-9' },
  { kind: 'symbols', label: 'Symbols', sample: '!@#$' },
]

const STRENGTH = {
  weak: { label: 'Weak', variant: 'destructive' },
  fair: { label: 'Fair', variant: 'warning' },
  strong: { label: 'Strong', variant: 'success' },
} as const

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

  const strength = STRENGTH[passwordStrength(password)]
  const chosen = KINDS.filter(({ kind }) => options[kind]).length

  return (
    <SectionCard
      title="Password Generator"
      description="Made in your browser from random bytes. Nothing is saved or sent."
    >
      <div className="flex max-w-2xl flex-col gap-6">
        <div className="bg-muted/40 flex flex-col gap-3 rounded-lg border p-4">
          <output
            aria-label="Generated password"
            aria-live="polite"
            className="font-mono text-lg leading-relaxed break-all select-all"
          >
            {password}
          </output>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={strength.variant} appearance="light">
              {strength.label}
            </Badge>
            <span className="flex-1" />
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={lengthId}>Length</Label>
            <span className="text-sm tabular-nums">{options.length} characters</span>
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
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {KINDS.map(({ kind, label, sample }) => (
            <label
              key={kind}
              htmlFor={`${lengthId}-${kind}`}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3"
            >
              <span className="flex flex-col">
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
      </div>
    </SectionCard>
  )
}
