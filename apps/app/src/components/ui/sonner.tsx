import * as React from 'react'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

/** Says what just happened: a pill on the card tone, over the page for a moment. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      // The browser's theme, as everything else follows.
      theme="system"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-2.5 rounded-row border border-border bg-card px-4 py-3 text-[13px] font-medium text-foreground shadow-float',
          description: 'text-muted-foreground font-normal',
          error: '[&_[data-icon]]:text-danger',
          success: '[&_[data-icon]]:text-good',
          actionButton: 'rounded-control bg-primary px-3 py-1.5 text-primary-foreground',
          cancelButton: 'rounded-control border border-border px-3 py-1.5',
          closeButton: 'text-muted-foreground hover:text-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
