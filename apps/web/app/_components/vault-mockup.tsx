import {
  AlertTriangleIcon,
  CheckIcon,
  CopyIcon,
  LockIcon,
  ScanIcon,
  SparklesIcon,
  SyncIcon,
} from "./icons";

type Tone = "emerald" | "amber" | "rose";

const tone: Record<Tone, { bar: string; text: string }> = {
  emerald: { bar: "bg-accent-bright", text: "text-accent-bright" },
  amber: { bar: "bg-amber-400", text: "text-amber-300 light:text-amber-700" },
  rose: { bar: "bg-rose-400", text: "text-rose-300 light:text-rose-700" },
};

const sidebar = [
  { label: "All items", count: 214, active: true },
  { label: "Logins", count: 178, active: false },
  { label: "Passkeys", count: 12, active: false },
  { label: "Notes", count: 21, active: false },
  { label: "Trash", count: 3, active: false },
];

const rows: {
  name: string;
  user: string;
  strength: string;
  pass: string;
  flag?: string;
  tone: Tone;
  width: string;
}[] = [
  {
    name: "Mail — Montara",
    user: "m.hartley@montara.dev",
    strength: "Strong",
    pass: "••••••••••••",
    tone: "emerald",
    width: "w-4/5",
  },
  {
    name: "Fintools Dashboard",
    user: "mhartley_92",
    strength: "Good",
    pass: "••••••••",
    tone: "amber",
    width: "w-3/5",
  },
  {
    name: "Legacy Forum",
    user: "mhartley",
    strength: "Weak",
    pass: "••••",
    tone: "rose",
    width: "w-1/4",
    flag: "Reused password",
  },
  {
    name: "Cloud Storage",
    user: "m.hartley@montara.dev",
    strength: "Strong",
    pass: "••••••••••",
    tone: "emerald",
    width: "w-3/4",
  },
  {
    name: "Design Suite",
    user: "hartley.m",
    strength: "Good",
    pass: "••••••••",
    tone: "amber",
    width: "w-1/2",
  },
];

export function VaultMockup() {
  return (
    <div className="relative">
      {/* Glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-8 rounded-[2rem] bg-[radial-gradient(closest-side,rgba(5,150,105,0.22),transparent)] blur-2xl"
      />

      {/* App window */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-abyss shadow-2xl shadow-black/50">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-line bg-card/60 px-4 py-3">
          <span className="size-2.5 rounded-full bg-rose-400/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-accent-bright/80" />
          <span className="ml-3 hidden rounded-md border border-line bg-abyss px-3 py-1 text-xs text-mist sm:block">
            montara-pass — Vault
          </span>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden w-44 shrink-0 flex-col gap-1 border-r border-line p-3 md:flex">
            {sidebar.map((item) => (
              <div
                key={item.label}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                  item.active ? "bg-accent/15 font-medium text-accent-soft" : "text-mist"
                }`}
              >
                <span>{item.label}</span>
                <span>{item.count}</span>
              </div>
            ))}
            <div className="mt-auto rounded-lg border border-line bg-card/60 p-3">
              <p className="text-[11px] leading-4 text-mist">Vault health</p>
              <p className="mt-1 font-heading text-lg font-semibold text-accent-soft">
                92<span className="text-sm text-mist">/100</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full w-[92%] rounded-full bg-accent-bright" />
              </div>
            </div>
          </div>

          {/* List */}
          <div className="min-w-0 flex-1 p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-line bg-card/60 px-3 py-2 text-xs text-mist">
                Search 214 items…
              </div>
              <span className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-on-accent">
                <SparklesIcon className="size-3.5" />
                New item
              </span>
            </div>

            <ul className="flex flex-col gap-2">
              {rows.map((row) => (
                <li
                  key={row.name}
                  className="flex items-center gap-3 rounded-xl border border-line bg-card/70 px-3 py-2.5"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand font-heading text-xs font-semibold text-accent-soft">
                    {row.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-fg sm:text-sm">
                        {row.name}
                      </span>
                      {row.flag ? (
                        <span className="hidden items-center gap-1 rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[10px] font-medium text-rose-300 light:text-rose-700 sm:inline-flex">
                          <AlertTriangleIcon className="size-3" />
                          {row.flag}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-[11px] text-mist">{row.user}</span>
                  </span>
                  <span className="hidden w-24 shrink-0 sm:block">
                    <span className={`text-[10px] font-medium ${tone[row.tone].text}`}>
                      {row.strength}
                    </span>
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-line">
                      <span
                        className={`block h-full rounded-full ${tone[row.tone].bar} ${row.width}`}
                      />
                    </span>
                  </span>
                  <span className="hidden font-mono text-xs text-mist lg:block">{row.pass}</span>
                  <CopyIcon className="size-4 shrink-0 text-mist" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -right-3 -top-5 hidden items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2.5 shadow-xl shadow-black/40 sm:flex lg:-right-8">
        <ScanIcon className="size-5 text-accent-bright" />
        <div className="text-xs">
          <p className="font-semibold text-fg">Breach scan</p>
          <p className="flex items-center gap-1 text-mist">
            <CheckIcon className="size-3 text-accent-bright" /> All clear
          </p>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2.5 shadow-xl shadow-black/40 sm:flex lg:-left-8">
        <span className="relative">
          <LockIcon className="size-5 text-accent-bright" />
          <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-accent">
            <CheckIcon className="size-2.5 text-on-accent" strokeWidth={3} />
          </span>
        </span>
        <div className="text-xs">
          <p className="font-semibold text-fg">Autofill ready</p>
          <p className="text-mist">38 logins filled this week</p>
        </div>
      </div>
      <div className="absolute -bottom-4 right-6 hidden items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2.5 shadow-xl shadow-black/40 lg:flex">
        <SyncIcon className="size-5 text-accent-bright" />
        <div className="text-xs">
          <p className="font-semibold text-fg">Synced</p>
          <p className="text-mist">4 devices · just now</p>
        </div>
      </div>
      {/* Reserved vertical space for overlapping badges */}
      <div aria-hidden="true" className="h-6 sm:h-8" />
    </div>
  );
}
