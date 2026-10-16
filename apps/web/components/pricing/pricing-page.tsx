"use client";

import { useState } from "react";

import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { docsUrl } from "@/components/links";
import { PricingLedger } from "@/components/pricing/ledger-panel";
import { formatAmount, SELF_HOST_HREF, TERMS, type Tier } from "@/components/pricing/plans";
import { chip } from "@/components/shared";

/**
 * The pricing page: the tiers as the receipt for the service.
 *
 * The tape on the left is the offer and the control; the ledger on the right is
 * the proof. Selecting a line marks it and names the action at the foot of the
 * tape, so choosing a tier and acting on it are one motion on one surface.
 *
 * The tiers come from the route, which reads them from the API; this component
 * only holds the selection.
 */
export function PricingPage({ tiers }: { tiers: Tier[] }) {
  // The tier the foot action offers. Monthly is where a visitor paying for the
  // hosted service starts; nothing on the page calls one tier recommended.
  const [chosen, setChosen] = useState("pro-monthly");
  // The fallback matters: when the API serves plans whose codes are not the
  // authored ones, the chosen code matches nothing, and the foot action must
  // still offer something you can pay for rather than the free self-hosted row.
  const selected =
    tiers.find((tier) => tier.code === chosen) ??
    tiers.find((tier) => tier.kind !== "free") ??
    tiers[0];

  return (
    <main>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="tape">
          <div className="tape-head">
            <p className="tape-slug">Montara Pass — pricing</p>
            <p className="tape-slug">billed in usd</p>
          </div>

          <h1 className="tape-title">
            Four prices. <span>One vault.</span>
          </h1>
          <p className="tape-lede">
            The encryption is the same on every row, including the free ones. What you pay for is
            who runs the server — ours, or yours.
          </p>

          <fieldset className="tape-lines">
            <legend className="sr-only">Choose a tier</legend>
            {tiers.map((tier) => {
              const on = tier.code === chosen;
              return (
                <label key={tier.code} className="tape-line" data-on={on || undefined}>
                  <input
                    type="radio"
                    name="tier"
                    value={tier.code}
                    checked={on}
                    onChange={() => setChosen(tier.code)}
                    className="sr-only"
                  />
                  <span className="tape-mark" aria-hidden="true" />
                  <span className="tape-body">
                    <span className="tape-name">{tier.name}</span>
                    <span className="tape-terms">{tier.terms}</span>
                  </span>
                  <span className="tape-amount">
                    {formatAmount(tier.amount, tier.currency)} <small>{tier.per}</small>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div className="tape-foot">
            <a href={selected.action.href} className="btn btn-primary">
              {selected.action.label}
              <ArrowRightIcon className="size-4" />
            </a>
            <a href={SELF_HOST_HREF} className="btn btn-secondary">
              Or run it yourself
            </a>
            <p className="tape-fineprint">
              <span className={chip}>{selected.chip}</span>
              <span className="block">{TERMS[selected.kind]}</span>
              {selected.kind !== "free" ? (
                <span className="block">
                  No refunds: access runs to the end of the period you paid for.
                </span>
              ) : null}
            </p>
          </div>

          {/* The foot changes with the selection; announce it rather than let it
              change silently for anyone not watching the tape. */}
          <p role="status" aria-live="polite" className="sr-only">
            {selected.name}: {selected.action.label}. {TERMS[selected.kind]}
          </p>
        </section>

        <PricingLedger />
      </div>

      <PricingBelow />
    </main>
  );
}

/** What "all features" means, so the phrase is not a claim without a list. */
const included = [
  "Logins and secure notes, in folders, with favorites and a trash",
  "Fill a login into the current page, and keep one a form just submitted",
  "Passkeys: create one, and sign in with a saved one",
  "Password generator and a password health view",
  "Share an item with another person as editor or viewer",
  "The web app, the browser extension, and the same vault on every device",
];

const gates = [
  {
    tier: "Self-hosted",
    gate: "Nothing. Every feature is in the image, and it is MIT-licensed.",
  },
  {
    tier: "Cloud, free account",
    gate: "You cannot share an item out to somebody else. You can still open an item shared with you.",
  },
  {
    tier: "Cloud, Pro",
    gate: "Nothing beyond the tier's price. Sharing an item out is included.",
  },
];

function PricingBelow() {
  return (
    <>
      <section
        aria-labelledby="included"
        className="border-t border-line px-6 py-20 sm:px-10 sm:py-24"
      >
        <div className="mx-auto grid max-w-4xl gap-12 md:grid-cols-[280px_minmax(0,1fr)]">
          <div>
            <h2 id="included" className="font-heading text-2xl font-medium tracking-tight">
              What every tier has
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-mist">
              There is one product, not three editions of it. Paying changes who runs the server.
            </p>
          </div>
          <ul className="flex flex-col gap-3.5">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[15px] leading-7 text-mist">
                <CheckIcon className="mt-1.5 size-4 shrink-0 text-fg" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="gates"
        className="border-t border-line px-6 py-20 sm:px-10 sm:py-24"
      >
        <div className="mx-auto max-w-4xl">
          <h2 id="gates" className="font-heading text-2xl font-medium tracking-tight">
            What changes between tiers
          </h2>
          <dl className="mt-8 border-t border-line">
            {gates.map((row) => (
              <div
                key={row.tier}
                className="grid gap-2 border-b border-line py-6 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-8"
              >
                <dt className="text-sm font-medium">{row.tier}</dt>
                <dd className="text-[15px] leading-7 text-mist">{row.gate}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 max-w-2xl text-[15px] leading-7 text-mist">
            Passkeys work on a free account. They live inside the encrypted item, so the server
            could not tell which items hold one even if we wanted it to.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="billing"
        className="border-t border-line px-6 py-20 sm:px-10 sm:py-24"
      >
        <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-2">
          <div>
            <h2 id="billing" className="font-heading text-2xl font-medium tracking-tight">
              Billing, plainly
            </h2>
            <ul className="mt-6 flex flex-col gap-4 text-[15px] leading-7 text-mist">
              <li>
                Lemon Squeezy handles the payment as the merchant of record. The card statement and
                the invoice carry Lemon Squeezy, not Montara Pass.
              </li>
              <li>
                A monthly or annual plan renews until you cancel. Cancelling stops the next charge
                and leaves the period you already paid for intact.
              </li>
              <li>The lifetime plan is one payment. It does not renew, and it does not expire.</li>
              <li>We do not refund. There is no trial period on the paid tiers.</li>
            </ul>
          </div>
          <div className="rounded-[14px] border border-line bg-card p-6 sm:p-7">
            <h3 className="text-sm text-mist">Before you pay</h3>
            <p className="mt-4 text-[15px] leading-7">
              Try the free account, or self-host. Both use the same vault, the same clients and the
              same encryption as Pro — nothing is held back for the paid tier except sharing an item
              out.
            </p>
            <a href={docsUrl("getting-started/docker")} className="btn btn-secondary mt-6">
              Read the Docker guide
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
