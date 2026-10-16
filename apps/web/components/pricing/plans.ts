import { APP_URL } from "@/components/links";

/**
 * The tiers the pricing page lists.
 *
 * Mock data, deliberately: the rows are written here so the page renders with
 * nothing behind it. Each Pro row carries what the hosted API serves at
 * `GET /api/v1/plans` (`apps/server` internal/models/billing.go) — a stable
 * `code`, an amount in the currency's minor unit, and its billing kind — so
 * pointing this module at that endpoint is the whole change once the plans are
 * seeded. Until then the home page's Cloud card and this page can disagree;
 * see `components/home/pricing.tsx`.
 */

export type Billing = "recurring" | "one_time";

/**
 * What a row actually is, which is not the same as how it bills: the two free
 * rows are `free`, and neither of them renews or is billed at all. The tape
 * foot keys its terms off this rather than off `billing`, so selecting the
 * self-hosted row never claims a charge.
 */
export type Kind = "free" | "recurring" | "one_time";

export type Tier = {
  /** Stable identifier, and the `?plan=` the web app's billing page reads. */
  code: string;
  name: string;
  /** What the tier is, in the product's own words. */
  terms: string;
  /** In the currency's minor unit: cents for USD. 0 for the free rows. */
  amount: number;
  currency: string;
  kind: Kind;
  /** The line after the amount. */
  per: string;
  /** The chip at the foot of the tape when this row is selected. */
  chip: string;
  /** Where the action goes. */
  action: { label: string; href: string };
};

/**
 * Where the self-hosted row leads: the deploy section on the home page. It is
 * an absolute path with a fragment because this page is not the one that
 * carries the section, so a bare "#self-host" would scroll nowhere here.
 */
export const SELF_HOST_HREF = "/#self-host";

export const TIERS: Tier[] = [
  {
    code: "self-hosted",
    name: "Self-hosted",
    terms: "one docker image · your postgres · mit licensed",
    amount: 0,
    currency: "USD",
    kind: "free",
    per: "forever",
    chip: "every feature",
    action: { label: "How to self-host", href: SELF_HOST_HREF },
  },
  {
    code: "cloud-free",
    name: "Cloud, free account",
    terms: "we run the server · no sharing items out",
    amount: 0,
    currency: "USD",
    kind: "free",
    per: "forever",
    chip: "no card needed",
    action: { label: "Create an account", href: `${APP_URL}/sign-up` },
  },
  {
    code: "pro-monthly",
    name: "Cloud, Pro — monthly",
    terms: "all features · renews monthly · cancel any time",
    amount: 300,
    currency: "USD",
    kind: "recurring",
    per: "/ month",
    chip: "all features",
    action: { label: "Subscribe monthly", href: `${APP_URL}/billing?plan=pro-monthly` },
  },
  {
    code: "pro-yearly",
    name: "Cloud, Pro — annual",
    terms: "all features · renews yearly · two months free",
    amount: 2500,
    currency: "USD",
    kind: "recurring",
    per: "/ year",
    chip: "all features",
    action: { label: "Subscribe annually", href: `${APP_URL}/billing?plan=pro-yearly` },
  },
  {
    code: "pro-lifetime",
    name: "Cloud, Pro — lifetime",
    terms: "all features · one payment · does not renew",
    amount: 30000,
    currency: "USD",
    kind: "one_time",
    per: "once",
    chip: "all features, for good",
    action: { label: "Buy lifetime", href: `${APP_URL}/billing?plan=pro-lifetime` },
  },
];

/**
 * The terms under the tape's action, which depend on what the selected row is
 * rather than on how it bills: a free row is never charged, and saying so is
 * the point of the page.
 */
export const TERMS: Record<Kind, string> = {
  free: "Nothing to pay, nothing to renew.",
  recurring: "Renews until canceled. Paid through Lemon Squeezy.",
  one_time: "One payment, no renewal. Paid through Lemon Squeezy.",
};

/** A tier's amount from cents, which the API counts every currency in. */
export function formatAmount(amount: number, currency: string): string {
  const digits = 2;
  const value = amount / 10 ** digits;
  // Whole amounts read as "$3", not "$3.00": a price list is scanned, and the
  // cents are noise on every row here.
  const fraction = Number.isInteger(value) ? 0 : digits;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency,
    minimumFractionDigits: fraction,
    maximumFractionDigits: Math.max(fraction, digits),
  }).format(value);
}
