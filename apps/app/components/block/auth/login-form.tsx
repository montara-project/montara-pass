'use client'

import { IconShieldLock } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field'
import { env } from '@/config/env'
import { useAppForm } from '@/hooks/form'
import { SignInSchema } from '@/lib/api/dtos/auth/schema'
import { signInWithEmail } from '@/lib/auth/email-auth'
import { HOME_PATH } from '@/lib/constants/auth'
import { cn } from '@/lib/utils'

export default function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useAppForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onSubmit: SignInSchema,
      onChange: SignInSchema,
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true)

      try {
        await signInWithEmail(value)
        router.replace(HOME_PATH)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    },
  })

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-8 items-center justify-center rounded-md">
            <IconShieldLock className="size-6" />
          </div>
          <h1 className="text-xl font-bold">{env.NEXT_PUBLIC_APP_NAME}</h1>
          <FieldDescription>Sign in to continue</FieldDescription>
        </div>

        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.AppField
            name="email"
            children={(field) => (
              <field.TextField label="Email" placeholder="type your email" asterisk />
            )}
          />

          <form.AppField
            name="password"
            children={(field) => (
              <field.PasswordField label="Password" placeholder="type your password" asterisk />
            )}
          />

          <Field>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Login'}
            </Button>
          </Field>
        </form>

        <FieldDescription className="text-center">
          No account yet? <Link href="/sign-up">Create one</Link>
        </FieldDescription>
      </FieldGroup>
    </div>
  )
}
