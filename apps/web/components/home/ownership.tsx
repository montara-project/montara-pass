import {
  DatabaseIcon,
  GlobeIcon,
  MailIcon,
  PackageIcon,
  PuzzleIcon,
  ServerIcon,
  ShieldCheckIcon,
  TerminalIcon,
} from "@/components/icons";
import { docsUrl } from "@/components/links";
import { card, chip, Dim, pill, Statement } from "@/components/shared";
import pkg from "@/package.json";

/** Top to bottom: what you install, what the image ships, where the data lands. */
const layers = [
  {
    name: "your devices",
    note: "client side",
    parts: [
      { icon: GlobeIcon, name: "Web app", role: "react 19" },
      { icon: PuzzleIcon, name: "Browser extension", role: "chrome · firefox" },
      { icon: TerminalIcon, name: "API clients", role: "rest" },
    ],
  },
  {
    name: "your docker host",
    note: "one image",
    parts: [
      { icon: PackageIcon, name: "Montara Pass image", role: "api + web app" },
      { icon: ServerIcon, name: "Go · Fiber v3", role: "port 8080" },
    ],
  },
  {
    name: "your data & services",
    note: "stays yours",
    parts: [
      { icon: DatabaseIcon, name: "PostgreSQL 18", role: "ciphertext, wrapped keys" },
      { icon: ShieldCheckIcon, name: "Authula", role: "password, magic link, google" },
      { icon: MailIcon, name: "Resend", role: "sign-in emails" },
    ],
  },
];

// The first three are the ones deploy/docker-compose.yml refuses to start without;
// the rest build the Community Edition, whose only account is the seeded one.
const deploySteps = [
  { title: "Create a Compose service", detail: "deploy/docker-compose.yml" },
  {
    title: "Set the secrets",
    detail:
      "POSTGRES_PASSWORD · APP_SECRET · AUTH_BASE_URL · EDITION=community · SEED_ON_BOOT=true · SUPER_USER",
  },
  { title: "Point a domain at :8080", detail: "Caddy · Traefik · Dokploy" },
  { title: "Deploy", detail: "docker compose up -d · migrations run on boot" },
];

const cardFoot = "mt-auto border-t border-line pt-6 font-mono text-xs leading-5 text-mist";

export function Ownership() {
  return (
    <section id="self-host" className="border-t border-line pb-20 sm:pb-28">
      <Statement
        eyebrow="the stack"
        title={
          <>
            <span className="inline-block">Your vault. Your server.</span> <Dim>Your Postgres.</Dim>
          </>
        }
      >
        One image holds the API and the web app. Add PostgreSQL 18 and a domain, and the ciphertext
        never leaves your infrastructure.
      </Statement>

      <div className="mx-auto -mt-4 grid max-w-5xl gap-6 px-6 md:grid-cols-2">
        <article className={`${card} flex flex-col`}>
          <span className={`${pill} self-start border border-line font-mono text-mist`}>
            the stack
          </span>
          <h3 className="mt-4 text-lg font-medium">What runs where</h3>
          <p className="mt-2 text-sm leading-6 text-mist">
            Top to bottom: what you install, what we ship in the image, and where your data lands.
          </p>

          <div className="mt-6 mb-8 flex flex-col gap-4">
            {layers.map((layer) => (
              <div key={layer.name} className="rounded-xl border border-line bg-ink/60 p-4">
                <p className="flex justify-between gap-3 font-mono text-xs tracking-wide text-mist">
                  {layer.name}
                  <span className="text-mist/70">{layer.note}</span>
                </p>
                <ul className="mt-3 flex flex-col gap-3">
                  {layer.parts.map((part) => (
                    <li key={part.name} className="flex items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accent/10 text-accent-bright">
                        <part.icon className="size-3.5" />
                      </span>
                      <span className="shrink-0 text-sm font-medium">{part.name}</span>
                      <span className="ml-auto text-right font-mono text-xs text-mist">
                        {part.role}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className={cardFoot}>
            <code className={`${chip} break-all bg-ink`}>
              ghcr.io/montara-project/montara-pass/community:v{pkg.version}
            </code>
            <span className="mt-2 block">one Compose service · nothing phones home</span>
          </p>
        </article>

        <article className={`${card} flex flex-col`}>
          <span className={`${pill} self-start border border-line`}>
            <span className="size-1.5 rounded-full bg-accent-bright" />
            ~10 minutes
          </span>
          <h3 className="mt-4 text-lg font-medium">How you get there</h3>
          <p className="mt-2 text-sm leading-6 text-mist">
            Four steps from a fresh server to your first encrypted item.
          </p>

          <ol className="mt-6 flex flex-col gap-5">
            {deploySteps.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-ink font-mono text-xs">
                  0{i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="mt-1 break-words font-mono text-xs text-mist">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 mb-8 overflow-hidden rounded-xl border border-line font-mono text-xs">
            <p className="flex items-center gap-2 border-b border-line bg-card-hover px-4 py-2.5 text-mist">
              <span className="size-2.5 rounded-full bg-red-400" />
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="size-2.5 rounded-full bg-emerald-400" />
              <span className="ml-1">terminal</span>
            </p>
            <pre className="overflow-x-auto bg-abyss px-4 py-4 leading-6 text-mist">
              <span className="text-fg">$ docker compose -f deploy/docker-compose.yml up -d</span>
              {"\napi  listening on :8080\nmigrations applied\n"}
              <span className="text-accent-bright">vault ready · open your domain</span>
            </pre>
          </div>

          <p className={cardFoot}>
            Needs Docker, PostgreSQL 18 and a domain. Resend is optional in the Community Edition.
          </p>
        </article>
      </div>

      <div className="mt-12 px-6 text-center">
        <a href={docsUrl("getting-started/docker")} className="btn btn-secondary">
          Read the Docker guide
        </a>
        <p className="mt-3 font-mono text-xs text-mist">
          docker · dokploy · configuration · migrations
        </p>
      </div>
    </section>
  );
}
