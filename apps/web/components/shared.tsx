import { CheckIcon, LockIcon } from "@/components/icons";

type Icon = typeof LockIcon;

/** The gray half of a two-tone heading. */
export function Dim({ children }: { children: React.ReactNode }) {
  return <span className="inline-block text-mist/75">{children}</span>;
}

/** A centred statement: two-tone heading and, at most, two lines of subcopy. */
export function Statement({
  title,
  eyebrow,
  children,
  as: Heading = "h2",
}: {
  title: React.ReactNode;
  /** A small pill above the heading naming the section. */
  eyebrow?: string;
  children?: React.ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
      {eyebrow ? (
        <span className={`${pill} mb-6 border border-line font-mono text-mist`}>{eyebrow}</span>
      ) : null}
      <Heading className="text-balance font-heading text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]">
        {title}
      </Heading>
      {children ? (
        <p className="mx-auto mt-6 max-w-xl text-pretty leading-7 text-mist">{children}</p>
      ) : null}
    </div>
  );
}

export function IconTile({ icon: Icon }: { icon: Icon }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-fg">
      <Icon className="size-4" />
    </span>
  );
}

export function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[15px] leading-6 text-mist">
      <CheckIcon className="mt-0.5 size-4 shrink-0 text-fg" />
      <span className="text-pretty">{children}</span>
    </li>
  );
}

export const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs";

export const chip =
  "rounded-md border border-line bg-card px-1.5 py-0.5 font-mono text-xs lowercase text-mist";

export const card = "rounded-[14px] border border-line bg-card p-6 shadow-sm shadow-black/5 sm:p-7";
