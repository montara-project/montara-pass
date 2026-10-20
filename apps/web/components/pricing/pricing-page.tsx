"use client";

import { useState } from "react";

import {
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
  InfinityIcon,
  ReceiptIcon,
  SyncIcon,
} from "@/components/icons";
import { docsUrl } from "@/components/links";
import { PricingLedger } from "@/components/pricing/ledger-panel";
import { formatAmount, SELF_HOST_HREF, TERMS, type Tier } from "@/components/pricing/plans";
import { card, pill } from "@/components/shared";

/**
 * The pricing page: the tiers as the receipt for the service.
 *
 * The tape on the left is the offer and the control; the ledger on the right is
 * the proof. Selecting a line marks it and names the action at the foot of the
 * tape, so choosing a tier and acting on it are one motion on one surface.
 *
 * The tiers come from the route, which read the plans on the server; this
 * component only holds the selection.
 */
export function PricingPage({ tiers }: { tiers: Tier[] }) {
  // The tier the foot action offers; none chosen yet means the yearly one, the
  // row marked best value. Matched by its billing rather than by code, because
  // the live plans' codes are the store's, not the authored ones.
  const [chosen, setChosen] = useState<string>();
  const yearly = tiers.find((tier) => tier.per === "/ year");
  const selected =
    tiers.find((tier) => tier.code === chosen) ??
    yearly ??
    tiers.find((tier) => tier.kind !== "free") ??
    tiers[0];
  const currency = "USD";

  return (
    <main>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="tape">
          <div className="tape-head">
            <p className="tape-slug">Montara Pass — pricing</p>
            <p className="tape-slug">billed in {currency}</p>
          </div>

          <h1 className="tape-title">Four prices. One vault.</h1>
          <p className="tape-lede">
            The encryption is the same on every row, including the free ones. What you pay for is
            who runs the server — ours, or yours.
          </p>

          <fieldset className="tape-lines">
            <legend className="sr-only">Choose a tier</legend>
            <p className="tape-cols tape-slug" aria-hidden="true">
              <span>Plan</span>
              <span>Price</span>
            </p>
            {tiers.map((tier) => {
              const on = tier.code === selected.code;
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
                  <span className="tape-body">
                    <span className="tape-name">
                      {tier.name}
                      {tier === yearly ? (
                        <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-xs font-normal text-emerald-400 light:text-emerald-700">
                          best value
                        </span>
                      ) : null}
                    </span>
                    <span className="tape-terms">{tier.terms}</span>
                    {tier.offer?.terms ? (
                      <span className="tape-terms text-emerald-400 light:text-emerald-700">
                        {tier.offer.terms}
                      </span>
                    ) : null}
                  </span>
                  <span className="tape-amount">
                    {tier.offer ? (
                      <s className="tape-was">
                        <span className="sr-only">was </span>
                        {formatAmount(tier.offer.was, currency)}
                      </s>
                    ) : null}
                    {formatAmount(tier.offer?.amount ?? tier.amount, currency)}{" "}
                    <small>{tier.per}</small>
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
          </div>
          <p className="tape-fineprint">
            {TERMS[selected.kind]}
            {selected.kind !== "free" ? (
              <span>No refunds: access runs to the end of the period you paid for.</span>
            ) : null}
          </p>

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

const billing = [
  {
    icon: CreditCardIcon,
    text: "Lemon Squeezy handles the payment as the merchant of record. The card statement and the invoice carry Lemon Squeezy, not Montara Pass.",
  },
  {
    icon: SyncIcon,
    text: "A monthly or annual plan renews until you cancel. Cancelling stops the next charge and leaves the period you already paid for intact.",
  },
  {
    icon: InfinityIcon,
    text: "The lifetime plan is one payment. It does not renew, and it does not expire.",
  },
  { icon: ReceiptIcon, text: "We do not refund. There is no trial period on the paid tiers." },
];

const heading = "font-heading text-2xl font-medium tracking-tight";
const below = "border-t border-line px-6 py-20 sm:px-10 sm:py-24";

function PricingBelow() {
  return (
    <>
      <section aria-labelledby="included" className={below}>
        <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 id="included" className={heading}>
              What every tier has
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-mist">
              There is one product, not three editions of it. Paying changes who runs the server.
            </p>
          </div>
          <ul className="flex flex-col gap-3.5">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] leading-7 text-mist">
                <CheckIcon className="mt-1.5 size-4 shrink-0 text-accent-bright" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="gates" className={below}>
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 id="gates" className={heading}>
              What changes between tiers
            </h2>
            <p className="mt-4 text-pretty text-[15px] leading-7 text-mist">
              Almost nothing. The gaps are in who runs the server, and whether you can share an item
              out.
            </p>
          </div>
          <dl className="mt-10 border-t border-line">
            {gates.map((row, i) => (
              <div
                key={row.tier}
                className="grid gap-2 border-b border-line py-7 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-8"
              >
                <dt className="text-[15px] font-medium">
                  {row.tier}
                  <span className="mt-1 block font-mono text-xs font-normal text-mist">
                    0{i + 1}
                  </span>
                </dt>
                <dd className="text-[15px] leading-7 text-mist">{row.gate}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-pretty text-center text-[15px] leading-7 text-mist/70">
            Passkeys work on a free account. They live inside the encrypted item, so the server
            could not tell which items hold one even if we wanted it to.
          </p>
        </div>
      </section>

      <section aria-labelledby="billing" className={below}>
        <div className="mx-auto grid max-w-4xl items-start gap-10 md:grid-cols-2">
          <div>
            <h2 id="billing" className={heading}>
              Billing, plainly
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-mist">
              Four things worth knowing before you enter a card. No surprises, no dark patterns.
            </p>
            <ul className="mt-6 flex flex-col gap-5">
              {billing.map((item) => (
                <li key={item.text} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-line bg-card text-accent-bright">
                    <item.icon className="size-3.5" />
                  </span>
                  <span className="text-[15px] leading-7 text-mist">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={card}>
            <span className={`${pill} border border-line font-mono text-mist`}>before you pay</span>
            <p className="mt-5 text-[15px] leading-7 text-mist">
              Try the free account, or self-host. Both use the same vault, the same clients and the
              same encryption as Pro — nothing is held back for the paid tier except sharing an item
              out.
            </p>
            <a href={docsUrl("getting-started/docker")} className="btn btn-secondary mt-7">
              Read the Docker guide
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
