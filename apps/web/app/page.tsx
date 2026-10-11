import pkg from "../package.json";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  GlobeIcon,
  KeyRoundIcon,
  LockIcon,
  LogoMark,
  PlusIcon,
  ServerIcon,
  ShareIcon,
  SparklesIcon,
  UsersIcon,
} from "./_components/icons";
import { docsUrl, REPO_URL } from "./_components/links";

/* ---------- Shared bits ---------- */

type Icon = typeof LockIcon;

/** The gray half of a two-tone heading. */
function Dim({ children }: { children: React.ReactNode }) {
  return <span className="text-mist/75">{children}</span>;
}

/** A centred statement: two-tone heading and, at most, two lines of subcopy. */
function Statement({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
      <h2 className="text-balance font-heading text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]">
        {title}
      </h2>
      {children ? (
        <p className="mx-auto mt-6 max-w-xl text-pretty leading-7 text-mist">{children}</p>
      ) : null}
    </div>
  );
}

function IconTile({ icon: Icon }: { icon: Icon }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-fg">
      <Icon className="size-4" />
    </span>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-mist">
      <CheckIcon className="mt-0.5 size-4 shrink-0 text-fg" />
      <span>{children}</span>
    </li>
  );
}

const chip =
  "rounded-md border border-line bg-card px-1.5 py-0.5 font-mono text-[11px] lowercase text-mist";

const card = "rounded-[14px] border border-line bg-card p-6 shadow-sm shadow-black/5 sm:p-7";

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section id="top" className="mx-auto max-w-3xl px-6 pb-24 pt-20 text-center sm:pb-28 sm:pt-28">
      <a
        href={`${REPO_URL}/blob/main/CHANGELOG.md`}
        className="inline-flex cursor-pointer items-center rounded-full border border-line bg-card text-xs transition-colors duration-200 hover:border-mist/50"
      >
        <span className="flex items-center gap-2 py-1.5 pl-3 pr-2.5 font-medium">
          <span className="size-1.5 rounded-full bg-accent-bright" />
          Latest release
        </span>
        <span className="border-l border-line py-1.5 pl-2.5 pr-3 font-mono text-mist">
          v{pkg.version}
        </span>
      </a>

      <h1 className="mt-8 text-balance font-heading text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
        A password manager <Dim>your server can&rsquo;t read.</Dim>
      </h1>
      <p className="mx-auto mt-7 max-w-lg text-pretty text-lg leading-8 text-mist">
        Montara Pass encrypts every login in the browser. The server you run stores ciphertext and
        wrapped keys. Nothing else.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <a href="#self-host" className="btn btn-primary">
          Self-host
          <ArrowRightIcon className="size-4" />
        </a>
        <a href={docsUrl()} className="btn btn-secondary">
          Read the docs
        </a>
      </div>

      <div className="mt-10 flex items-center justify-center gap-3 text-left">
        <LogoMark className="size-8 rounded-full" />
        <p className="text-sm leading-5">
          Built by Montara Project.
          <span className="block font-mono text-xs lowercase text-mist">
            argon2id · aes-256-gcm · rsa-oaep 3072
          </span>
        </p>
      </div>
    </section>
  );
}

/* ---------- Trust strip ---------- */

const stack = [
  // The Fiber mark is plain black, so it is inverted on the dark theme.
  { src: "fiber.svg", name: "Go · Fiber v3", mono: true },
  { src: "postgresql.svg", name: "PostgreSQL 18" },
  { src: "react.svg", name: "React 19" },
  { src: "authula.png", name: "Authula" },
  { src: "docker.svg", name: "Docker" },
];

function TrustStrip() {
  return (
    <section className="grid border-t border-line md:grid-cols-[220px_1fr]">
      <p className="border-line px-6 py-5 text-sm font-medium max-md:border-b sm:px-10 md:border-r md:py-7">
        What it runs on.
      </p>
      <ul className="flex flex-wrap items-center gap-x-10 gap-y-4 px-6 py-5 sm:px-10 md:justify-between md:py-7">
        {stack.map((item) => (
          <li key={item.name} className="flex items-center gap-2.5 text-sm text-mist">
            <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-card">
              <img
                src={`/static/stack/${item.src}`}
                alt=""
                width={20}
                height={20}
                className={`size-5 object-contain ${item.mono ? "invert light:invert-0" : ""}`}
              />
            </span>
            {item.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Product explainer ---------- */

const art = "mt-6 rounded-[10px] border border-line bg-abyss p-4 font-mono text-[11px] leading-5";

function UnlockArt() {
  const lines = [
    ["argon2id", "64 MiB · 3 passes"],
    ["master key", "→ vault key"],
    ["vault key", "→ private key"],
    ["private key", "→ item keys"],
  ];
  return (
    <div className={art} aria-hidden="true">
      <p className="text-mist">
        <span className="text-accent-bright">$</span> unlock
      </p>
      {lines.map(([left, right]) => (
        <p key={left} className="flex justify-between gap-3">
          <span className="text-fg">{left}</span>
          <span className="text-mist">{right}</span>
        </p>
      ))}
    </div>
  );
}

function RowsArt() {
  const rows = [
    ["login", "9fK2c1…Qx0="],
    ["login", "Zt81vB…mA4="],
    ["secure_note", "b0LwE7…7gk="],
  ];
  return (
    <div className={art} aria-hidden="true">
      <p className="flex justify-between gap-3 border-b border-line pb-1.5 text-mist">
        <span>type</span>
        <span>content</span>
      </p>
      {rows.map(([type, content]) => (
        <p key={content} className="flex justify-between gap-3 pt-1.5">
          <span className="text-fg">{type}</span>
          <span className="text-mist">{content}</span>
        </p>
      ))}
    </div>
  );
}

function MembersArt() {
  const members = [
    ["w-24", "owner"],
    ["w-20", "editor"],
    ["w-28", "viewer"],
  ];
  return (
    <div className={`${art} flex flex-col gap-2.5`} aria-hidden="true">
      {members.map(([width, role]) => (
        <p key={role} className="flex items-center gap-2.5">
          <span className="size-5 rounded-full border border-line bg-card" />
          <span className={`h-1.5 rounded-full bg-line ${width}`} />
          <span className="ml-auto rounded border border-line px-1.5 text-mist">{role}</span>
        </p>
      ))}
    </div>
  );
}

const layers = [
  {
    icon: KeyRoundIcon,
    title: "Master key",
    meta: "argon2id · 16-byte salt · 32-byte key",
    body: "Your master password becomes a key on your device. It is derived on unlock, takes about a second, and is stored nowhere.",
    art: <UnlockArt />,
  },
  {
    icon: LockIcon,
    title: "Item keys",
    meta: "aes-256-gcm · one key per item",
    body: "Every item is sealed with its own random key. Name, username, password, URL and notes are all inside the ciphertext.",
    art: <RowsArt />,
  },
  {
    icon: ShareIcon,
    title: "Wrapped per member",
    meta: "rsa-oaep · 3072-bit · sha-256",
    body: "Sharing wraps the item key with the recipient's public key. The content is not re-encrypted and the server never holds the key.",
    art: <MembersArt />,
  },
];

function Explainer() {
  return (
    <section id="security" className="border-t border-line">
      <Statement
        title={
          <>
            Encrypted in the browser. <Dim>Stored as ciphertext.</Dim>
          </>
        }
      >
        Three layers of keys. The server keeps the wrapped ones and can open none of them.
      </Statement>
      <div className="grid gap-px border-t border-line bg-line md:grid-cols-3">
        {layers.map((layer) => (
          <article key={layer.title} className="bg-ink p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <IconTile icon={layer.icon} />
              <h3 className="font-medium">{layer.title}</h3>
            </div>
            <p className="mt-4 font-mono text-xs lowercase text-mist">{layer.meta}</p>
            <p className="mt-3 text-sm leading-6 text-mist">{layer.body}</p>
            {layer.art}
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Feature matrix ---------- */

const surfaces = [
  { id: "all", label: "all" },
  { id: "app", label: "web app" },
  { id: "extension", label: "extension" },
  { id: "api", label: "api" },
];

const features = [
  {
    title: "Logins and secure notes",
    body: "Two item types. The type is the only field stored in the clear, so clients can filter by it.",
    on: ["app", "extension", "api"],
  },
  {
    title: "Fill on click",
    body: "The extension touches the active tab only when you click Fill. It reads no page on its own.",
    on: ["extension"],
  },
  {
    title: "Host matching",
    body: "A login is offered on its saved host and that host's subdomains. example.com.evil.net gets nothing.",
    on: ["extension"],
  },
  {
    title: "Password generator",
    body: "Saving a login from the popup generates a password for it. 20 characters by default.",
    on: ["extension"],
  },
  {
    title: "Sharing with roles",
    body: "Share one item with another user as editor or viewer. Every item has exactly one owner.",
    on: ["app", "api"],
  },
  {
    title: "Key rotation on revoke",
    body: "Removing a member re-encrypts the item under a new key, wrapped for whoever is left.",
    on: ["app", "api"],
  },
  {
    title: "Folders, favorites, trash",
    body: "Folder names are encrypted. Folder and favorite stay personal, even on a shared item.",
    on: ["app", "api"],
  },
  {
    title: "Auto-lock",
    body: "The web app locks on reload. The extension locks after 15 minutes without use, or when the browser closes.",
    on: ["app", "extension"],
  },
  {
    title: "Conflict-safe edits",
    body: "Every write names the revision it read. A stale one gets 409 Conflict instead of overwriting.",
    on: ["app", "api"],
  },
];

function FeatureMatrix() {
  return (
    <section id="features" className="matrix border-t border-line">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-10">
        <p className="font-mono text-xs lowercase text-mist">
          {features.length} features in v{pkg.version}. filter by where they run.
        </p>
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">Filter features by where they run</legend>
          {surfaces.map((surface) => (
            <label
              key={surface.id}
              className="cursor-pointer rounded-full border border-line px-3 py-1 font-mono text-xs text-mist transition-colors duration-200 hover:border-mist/50 has-checked:border-fg has-checked:bg-fg has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-bright"
            >
              <input
                type="radio"
                name="surface"
                id={`surface-${surface.id}`}
                defaultChecked={surface.id === "all"}
                className="sr-only"
              />
              {surface.label}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="grid gap-px border-t border-line bg-line md:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className="flex flex-col bg-ink p-6 sm:p-8">
            <div
              data-surfaces={feature.on.join(" ")}
              className="flex flex-1 flex-col transition-opacity duration-200 motion-reduce:transition-none"
            >
              <h3 className="font-medium">{feature.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-mist">{feature.body}</p>
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {feature.on.map((id) => (
                  <li key={id} className={chip}>
                    {surfaces.find((surface) => surface.id === id)?.label}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Ownership ---------- */

const parts = [
  { icon: ServerIcon, name: "One Docker image", role: "api and web app" },
  { icon: SparklesIcon, name: "Go · Fiber v3", role: "the api" },
  { icon: LockIcon, name: "PostgreSQL 18", role: "ciphertext, wrapped keys" },
  { icon: UsersIcon, name: "Authula", role: "password, magic link, google" },
  { icon: GlobeIcon, name: "Resend", role: "sign-in emails" },
];

const deploySteps = [
  "Create a Compose service from deploy/docker-compose.yml",
  "Set the database password, app secret and public URL",
  "Add a domain for the server on port 8080",
  "Deploy. Migrations run on boot",
];

function Ownership() {
  return (
    <section id="self-host" className="border-t border-line pb-20 sm:pb-28">
      <Statement
        title={
          <>
            Your vault. Your server. <Dim>Your Postgres.</Dim>
          </>
        }
      >
        One image holds the API and the web app. Add PostgreSQL 18 and a domain, and the ciphertext
        never leaves your infrastructure.
      </Statement>

      <div className="mx-auto -mt-8 grid max-w-4xl gap-6 px-6 md:grid-cols-2">
        <div className={card}>
          <h3 className="text-sm text-mist">What you end up with</h3>
          <ul className="mt-5 flex flex-col gap-4">
            {parts.map((part) => (
              <li key={part.name} className="flex items-center gap-3">
                <IconTile icon={part.icon} />
                <span className="text-sm font-medium">{part.name}</span>
                <span className="ml-auto text-right font-mono text-xs lowercase text-mist">
                  {part.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className={card}>
          <h3 className="text-sm text-mist">How you get there</h3>
          <ol className="mt-5 flex flex-col gap-4">
            {deploySteps.map((step, i) => (
              <li key={step} className="flex min-h-8 items-center gap-3 text-sm font-medium">
                <span className="font-mono text-xs font-normal text-mist">0{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className="mt-12 px-6 text-center">
        <a
          href={docsUrl("getting-started/docker")}
          className="nudge inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          Read the Docker guide
          <ArrowUpRightIcon className="size-4" />
        </a>
        <span className="mt-2 block font-mono text-xs lowercase text-mist">
          in the docs: docker, dokploy, configuration and migrations.
        </span>
      </p>
    </section>
  );
}

/* ---------- Steps ---------- */

const steps = [
  {
    icon: ServerIcon,
    title: "Deploy",
    body: "Run the Compose stack. The server waits for PostgreSQL, applies its migrations and answers on /api/health.",
  },
  {
    icon: KeyRoundIcon,
    title: "Create your vault",
    body: "Sign up in the web app and choose a master password of 12 characters or more. The keys are made in your browser.",
  },
  {
    icon: SparklesIcon,
    title: "Fill",
    body: "Build the extension, point it at your server's origin, unlock, and click Fill on a login page.",
  },
];

function Steps() {
  return (
    <section className="border-t border-line">
      <Statement
        title={
          <>
            <Dim>Three steps</Dim> from deploy to first fill.
          </>
        }
      />
      <ol className="grid gap-px border-t border-line bg-line md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="relative overflow-hidden bg-ink p-6 sm:p-8">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-5 right-3 select-none font-mono text-[8.5rem] font-semibold leading-none text-fg/[0.045]"
            >
              0{i + 1}
            </span>
            <div className="relative flex items-center gap-3">
              <IconTile icon={step.icon} />
              <h3 className="font-medium">{step.title}</h3>
            </div>
            <p className="relative mt-3 text-sm leading-6 text-mist">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Pricing ---------- */

function Pricing() {
  return (
    <section id="pricing" className="border-t border-line pb-20 sm:pb-28">
      <Statement
        title={
          <>
            Free to run. <Dim>Hosted comes later.</Dim>
          </>
        }
      >
        Self-hosting costs you a server and nothing to us. A hosted plan is planned and not for sale
        yet.
      </Statement>

      <div className="mx-auto -mt-8 grid max-w-4xl gap-6 px-6 md:grid-cols-2">
        <article className={`${card} flex flex-col`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">Self-hosted</h3>
            <span className={chip}>available now</span>
          </div>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="font-heading text-5xl font-medium tracking-tight">$0</span>
            <span className="font-mono text-xs lowercase text-mist">forever</span>
          </p>
          <ul className="mt-6 flex flex-1 flex-col gap-3">
            <Check>Web app, browser extension and API</Check>
            <Check>Sharing with roles and key rotation</Check>
            <Check>Your server, your PostgreSQL, your backups</Check>
            <Check>No tiers. Every feature is in the image</Check>
          </ul>
          <a href="#self-host" className="btn btn-primary mt-8">
            Self-host
            <ArrowRightIcon className="size-4" />
          </a>
        </article>

        <article className={`${card} flex flex-col`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">Cloud</h3>
            <span className={chip}>coming soon</span>
          </div>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="font-heading text-5xl font-medium tracking-tight text-mist/75">
              $$
            </span>
            <span className="font-mono text-xs lowercase text-mist">not priced yet</span>
          </p>
          <ul className="mt-6 flex flex-1 flex-col gap-3">
            <Check>The same encryption, done in your browser</Check>
            <Check>We run the server and PostgreSQL</Check>
            <Check>No Docker, no migrations</Check>
            <li className="flex items-start gap-2.5 text-sm text-accent-bright">
              <span className="mx-1 mt-1.5 size-2 shrink-0 rounded-full bg-accent-bright" />
              Self-hosted is available today
            </li>
          </ul>
          <button
            type="button"
            disabled
            className="btn mt-8 cursor-not-allowed border-line bg-line text-mist"
          >
            Not available yet
          </button>
        </article>
      </div>

      <p className="mx-auto mt-10 max-w-xl px-6 text-center font-mono text-xs leading-5 text-mist">
        Self-hosting needs Docker, PostgreSQL 18, a domain and a Resend API key for sign-in emails.
      </p>
      <p className="mt-3 px-6 text-center text-sm text-mist">
        Want to know when Cloud opens?{" "}
        <a
          href="/contact"
          className="cursor-pointer font-medium text-fg underline-offset-4 hover:underline"
        >
          Contact us
        </a>
      </p>
    </section>
  );
}

/* ---------- FAQ ---------- */

const faqs = [
  {
    q: "What can the server see?",
    a: "Ciphertext, wrapped keys, and one field in the clear: the item type, login or secure_note, so clients can filter. It also knows your account email and which users an item is shared with. It never receives the master password, any unwrapped key, item content or folder names.",
  },
  {
    q: "What happens if I forget my master password?",
    a: "The vault cannot be read by anyone. The server holds nothing that can open the vault key, so there is no reset and no recovery.",
  },
  {
    q: "Is the master password my sign-in password?",
    a: "No. You sign in with a password, a magic link or Google. The master password is separate, unlocks the vault on your device and never reaches the server.",
  },
  {
    q: "What do I need to self-host?",
    a: "A server with Docker, PostgreSQL 18 (the schema uses uuidv7()), a domain with HTTPS and a Resend API key for sign-in emails. The repository ships a Compose stack for Dokploy.",
  },
  {
    q: "Which browsers does the extension support?",
    a: "Chrome, other Chromium browsers and Firefox 128 or newer. You build it with pnpm build:extension and load it from disk, then point it at your server's origin.",
  },
  {
    q: "Is there a mobile app?",
    a: "No. There is the web app and the browser extension.",
  },
  {
    q: "Can a removed member still read a shared item?",
    a: "Not future versions. Removing a member rotates the item key. Anything they already read, they have read, so change the password itself if that matters.",
  },
  {
    q: "Why is search done in the browser?",
    a: "The server cannot search or sort encrypted content. The web app decrypts the page it received and filters there. Folder, type and trash are filtered on the server.",
  },
];

function Faq() {
  return (
    <section id="faq" className="border-t border-line pb-20 sm:pb-28">
      <Statement
        title={
          <>
            Questions people ask <Dim>before trusting a vault.</Dim>
          </>
        }
      />
      <div className="mx-auto -mt-8 max-w-2xl border-t border-line px-6 sm:px-0">
        {faqs.map((item) => (
          <details key={item.q} className="group border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-1 py-5 text-sm font-medium sm:px-4">
              {item.q}
              <PlusIcon className="size-4 shrink-0 text-mist transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" />
            </summary>
            <p className="px-1 pb-6 text-sm leading-6 text-mist sm:px-4">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-line">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_55%_at_50%_50%,color-mix(in_srgb,var(--color-accent)_24%,transparent),transparent)] light:bg-[radial-gradient(40%_55%_at_50%_50%,color-mix(in_srgb,var(--color-accent)_10%,transparent),transparent)]"
      />
      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
        <h2 className="text-balance font-heading text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          Run your own vault. <Dim>Keep your own keys.</Dim>
        </h2>
        <p className="mx-auto mt-7 max-w-md text-pretty text-lg leading-8 text-mist">
          One Compose file, one PostgreSQL database, one domain.
        </p>
        <a href="#self-host" className="btn btn-primary mt-9">
          Self-host
          <ArrowRightIcon className="size-4" />
        </a>
      </div>
    </section>
  );
}

/* ---------- Page ---------- */

export default function Home() {
  return (
    <main>
      <Hero />
      <TrustStrip />
      <Explainer />
      <FeatureMatrix />
      <Ownership />
      <Steps />
      <Pricing />
      <Faq />
      <FinalCta />
    </main>
  );
}
