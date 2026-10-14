interface AuthShellProps {
  title: string
  /** One line under the title: which secret this screen asks for. */
  note?: React.ReactNode
  children: React.ReactNode
  /** The way out of the screen, kept quieter than the way through it. */
  foot?: React.ReactNode
}

/**
 * The one generous layout of the app: a screen with a single thing to ask
 * (sign in, sign up, unlock, create the vault), in a card in the middle of
 * the page.
 */
export default function AuthShell({ title, note, children, foot }: AuthShellProps) {
  return (
    <main className="bg-background flex min-h-svh items-center justify-center p-4 sm:p-6">
      <div className="rounded-sheet bg-panel flex w-full max-w-[400px] flex-col gap-3.5 border px-5 pt-10 pb-6 sm:px-7 sm:pt-[52px]">
        {/* Decorative: the title under it names what the screen is for. */}
        <img
          src="/static/logo-128.png"
          alt=""
          width={72}
          height={72}
          className="size-[72px] self-center"
        />
        <h1 className="mt-2 mb-1.5 text-center text-[26px] leading-tight font-bold tracking-[-0.02em] text-balance">
          {title}
        </h1>
        {note && (
          <p className="text-muted-foreground text-center text-[13px] text-balance">{note}</p>
        )}
        {children}
        {foot && <div className="flex flex-col items-center gap-2 pt-6">{foot}</div>}
      </div>
    </main>
  )
}

/** A text link of these screens: underlined, faint until it is pointed at. */
export const authLink =
  'text-muted-foreground hover:text-foreground rounded-sm px-1.5 py-1 text-[13px] font-medium underline decoration-border underline-offset-[3px] transition-colors duration-[120ms] hover:decoration-current motion-reduce:transition-none'

/** A way in rather than out, and part of a sentence: the answer to the question before it. */
export const authLinkStrong =
  'text-foreground rounded-sm px-0.5 py-1 font-semibold underline decoration-muted-foreground underline-offset-[3px] transition-colors duration-[120ms] hover:decoration-current motion-reduce:transition-none'
