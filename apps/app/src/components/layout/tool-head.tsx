/** The heading of a tool: a tile with its icon, its name, and what it does with your data. */
export default function ToolHead({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <header className="flex items-center gap-3.5">
      <span className="rounded-card bg-background inline-flex size-12 shrink-0 items-center justify-center border">
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{title}</h1>
        <p className="text-muted-foreground text-[13px]">{description}</p>
      </div>
    </header>
  )
}
