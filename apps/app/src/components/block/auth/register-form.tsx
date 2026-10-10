import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field'
import { useAppForm } from '@/hooks/form'
import { SignUpSchema } from '@/lib/api/dtos/auth/schema'
import { signUpWithEmail } from '@/lib/auth/email-auth'
import { HOME_PATH, SIGN_IN_PATH } from '@/lib/constants/auth'
import { cn } from '@/lib/utils'

export default function RegisterForm({ className, ...props }: React.ComponentProps<'div'>) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const form = useAppForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
    validators: {
      onSubmit: SignUpSchema,
      onChange: SignUpSchema,
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true)

      try {
        const { signedIn } = await signUpWithEmail(value)
        if (signedIn) {
          await navigate({ to: HOME_PATH, replace: true })
          return
        }

        toast.success('Account created. Check your email to verify it, then sign in.')
        await navigate({ to: SIGN_IN_PATH, replace: true })
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
          <img src="/static/logo-128.png" alt="" width={48} height={48} className="size-12" />
          <h1 className="text-xl font-bold">Create your account</h1>
          <FieldDescription>
            This password signs you in. You choose a separate master password for the vault next.
          </FieldDescription>
        </div>

        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.AppField
            name="name"
            children={(field) => <field.TextField label="Name" placeholder="your name" asterisk />}
          />

          <form.AppField
            name="email"
            children={(field) => (
              <field.TextField label="Email" placeholder="type your email" asterisk />
            )}
          />

          <form.AppField
            name="password"
            children={(field) => (
              <field.PasswordField label="Password" placeholder="at least 8 characters" asterisk />
            )}
          />

          <Field>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </Field>
        </form>

        <FieldDescription className="text-center">
          Already have an account? <Link to={SIGN_IN_PATH}>Sign in</Link>
        </FieldDescription>
      </FieldGroup>
    </div>
  )
}
