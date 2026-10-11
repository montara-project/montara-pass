import { KeyRoundIcon, ServerIcon, SparklesIcon } from "@/components/icons";

import { Dim, Statement, IconTile } from "./shared";

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

export function Steps() {
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
            <p className="relative mt-3 text-[15px] leading-7 text-mist">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
