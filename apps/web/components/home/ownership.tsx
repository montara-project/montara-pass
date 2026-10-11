import {
  ArrowUpRightIcon,
  GlobeIcon,
  LockIcon,
  ServerIcon,
  SparklesIcon,
  UsersIcon,
} from "@/components/icons";
import { docsUrl } from "@/components/links";

import { Dim, Statement, IconTile, card } from "./shared";

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

export function Ownership() {
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
