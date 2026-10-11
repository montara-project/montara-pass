import { ArrowRightIcon } from "@/components/icons";
import { Dim, Statement, Check, chip, card } from "@/components/shared";

export function Pricing() {
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
            <li className="flex items-start gap-2.5 text-[15px] leading-6 text-accent-bright">
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
