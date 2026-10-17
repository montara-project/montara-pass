"use client";

import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { docsUrl } from "@/components/links";
import { useTiers } from "@/components/pricing/offer";
import { formatAmount, type Tier } from "@/components/pricing/plans";
import { card } from "@/components/shared";

const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs";

export function Pricing() {
  // The same rows as the pricing page: live plans, or the authored ones until
  // the hosted service has some.
  const paid = useTiers().filter((tier) => tier.kind !== "free");
  const monthly = paid.find((tier) => tier.per === "/ month");

  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-3xl px-6 pt-20 text-center sm:pt-28">
        <span className={`${pill} border border-line font-mono text-mist`}>pricing</span>
        <h2 className="mt-6 text-balance font-heading text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]">
          Free to run. Or let us host it.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-pretty leading-7 text-mist">
          Self-hosting costs you a server and nothing to us. Cloud runs it for you, cancel anytime.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-6 px-6 md:grid-cols-2">
        <article className={`${card} flex flex-col`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-medium">Self-hosted</h3>
            <span className={`${pill} border border-line`}>
              <span className="size-1.5 rounded-full bg-accent-bright" />
              available now
            </span>
          </div>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="font-heading text-5xl font-medium tracking-tight">$0</span>
            <span className="font-mono text-xs lowercase text-mist">forever</span>
          </p>
          <p className="mt-5 border-b border-line pb-5 text-[15px] text-mist">
            Run it on your own hardware. Nothing to us, nothing to renew.
          </p>
          <ul className="mt-5 flex flex-1 flex-col gap-3">
            {[
              "Web app, browser extension and API",
              "Sharing with roles and key rotation",
              "Your server, your PostgreSQL, your backups",
              "No tiers. Every feature is in the image",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-[15px] leading-6 text-mist">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-accent-bright" />
                {line}
              </li>
            ))}
          </ul>
          <a href={docsUrl("getting-started/docker")} className="btn btn-primary mt-8 w-full">
            Read the docs
            <ArrowRightIcon className="size-4" />
          </a>
          <p className="mt-6 font-mono text-xs text-mist">
            Docker · PostgreSQL 18 · domain · Resend API key
          </p>
        </article>

        <article
          className={`${card.replace("border-line", "border-accent/40")} flex flex-col bg-[radial-gradient(120%_70%_at_25%_0%,color-mix(in_srgb,var(--color-accent)_20%,transparent),transparent_70%)]`}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-medium">Cloud</h3>
            <span className={`${pill} bg-accent-bright/15 text-accent-bright`}>most popular</span>
          </div>
          <p className="mt-5 border-b border-line pb-5 text-[15px] leading-6 text-mist">
            We run the server and PostgreSQL for you. The same zero-knowledge encryption.
          </p>
          <ul className="flex flex-1 flex-col divide-y divide-line">
            {paid.map((tier) => (
              <PlanRow key={tier.code} tier={tier} monthly={monthly} />
            ))}
          </ul>
          <p className="mt-6 font-mono text-xs text-mist">
            Paid through Lemon Squeezy · cancel anytime
          </p>
        </article>
      </div>

      <p className="mt-16 border-t border-line px-6 py-8 text-center text-sm text-mist sm:mt-20">
        Need a business plan or an invoice?{" "}
        <a href="/contact" className="nudge font-medium text-accent-bright">
          Contact us
          <ArrowRightIcon className="ml-1 inline size-3.5" />
        </a>
      </p>
    </section>
  );
}

/** One Cloud plan; the yearly one is set against twelve months of the monthly. */
function PlanRow({ tier, monthly }: { tier: Tier; monthly?: Tier }) {
  const yearly = tier.per === "/ year";
  const full = yearly && monthly ? monthly.amount * 12 : 0;
  const freeMonths = full > tier.amount ? Math.round((full - tier.amount) / monthly!.amount) : 0;
  const note =
    tier.kind === "one_time"
      ? "one payment"
      : freeMonths > 0
        ? `free ${freeMonths} months`
        : `billed ${yearly ? "yearly" : "monthly"}`;

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4">
      <div className="flex min-w-0 flex-col">
        <span className="font-medium">
          {tier.kind === "one_time" ? "Lifetime" : yearly ? "Yearly" : "Monthly"}
        </span>
        <span
          className={`whitespace-nowrap font-mono text-xs ${freeMonths > 0 ? "text-emerald-400 light:text-emerald-600" : "text-mist"}`}
        >
          {note}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="whitespace-nowrap text-lg font-medium">
            {formatAmount(tier.amount, "USD")}
          </span>
          {freeMonths > 0 ? (
            <span className="whitespace-nowrap font-mono text-xs text-mist">
              was {formatAmount(full, "USD")}
            </span>
          ) : null}
        </div>
        <a
          href={tier.action.href}
          className={`btn shrink-0 ${yearly ? "btn-primary" : "btn-secondary"}`}
        >
          {tier.kind === "one_time" ? "Buy once" : "Subscribe"}
        </a>
      </div>
    </li>
  );
}
