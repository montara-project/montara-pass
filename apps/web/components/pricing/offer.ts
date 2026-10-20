import { APP_URL } from "@/components/links";
import { formatAmount, type Tier, TIERS } from "@/components/pricing/plans";

/**
 * The tiers the page lists: the two free rows, plus one row per plan the hosted
 * service has on offer.
 *
 * Read from the same endpoint the home page's Cloud card reads
 * (`apps/web/components/home/pricing.tsx`), so the two surfaces cannot
 * disagree. The API orders plans cheapest first within each billing kind
 * (`apps/server` repositories/billing.go), which is the order the tape wants.
 *
 * Until plans are seeded the API answers with none, and the authored rows in
 * `plans.ts` stand in so the page is complete. When they are seeded, the live
 * amounts and names replace the authored ones.
 */

/** A plan as `GET /api/v1/plans` serves it (apps/server internal/models/billing.go); only the fields the site reads. */
interface Plan {
  code: string;
  billing: "recurring" | "one_time";
  billing_interval: "month" | "year" | null;
  /** In the currency's minor unit. */
  amount: number;
  currency: string;
  /** What it is marked down from, set by hand; null for none. */
  compare_at_amount: number | null;
  /**
   * A public discount code, filled in at checkout: what it takes off, how many
   * payments it takes it off (null: all of them), and when it ends (null:
   * never). Null for none.
   */
  discount_amount: number | null;
  discount_payments: number | null;
  discount_ends_at: string | null;
}

const FREE_TIERS = TIERS.filter((tier) => tier.kind === "free");

// dd/MM/yyyy, as the web app's billing page writes the same date.
const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "short" });

/** What a plan's discount code takes off, while it runs; 0 for none. */
function discountOff(plan: Plan): number {
  const ended = plan.discount_ends_at !== null && Date.parse(plan.discount_ends_at) <= Date.now();
  return ended ? 0 : (plan.discount_amount ?? 0);
}

/**
 * The plan's offer, read as the web app's billing cards read it
 * (`planSaving` and `planOffer` in packages/shared/src/plan.ts): the first
 * payment after a running code, against its compare-at price or else its own,
 * and which payments the code takes off and until when. None when it costs
 * no less.
 */
function offerOf(plan: Plan, per: string): Tier["offer"] {
  const off = discountOff(plan);
  const amount = plan.amount - off;
  const was = Math.max(plan.compare_at_amount ?? 0, off ? plan.amount : 0);
  if (was <= amount) return undefined;

  const parts: string[] = [];
  const n = plan.discount_payments;
  if (off && plan.billing_interval && n !== null) {
    const unit = n === 1 ? plan.billing_interval : `${n} ${plan.billing_interval}s`;
    parts.push(`first ${unit}, then ${formatAmount(plan.amount, plan.currency)} ${per}`);
  }
  if (off && plan.discount_ends_at) {
    parts.push(`offer ends ${DATE.format(new Date(plan.discount_ends_at))}`);
  }
  return { amount, was, terms: parts.length ? parts.join(" · ") : null };
}

/** A live plan as a tape row. */
function fromPlan(plan: Plan): Tier {
  const oneTime = plan.billing === "one_time";
  const yearly = plan.billing_interval === "year";
  const per = oneTime ? "once" : yearly ? "/ year" : "/ month";
  return {
    code: plan.code,
    // The API's names carry the product and the store's environment
    // ("Montara Pass Pro Monthly - Sandbox"); the tape names the tier alone.
    name: `Pro ${oneTime ? "Lifetime" : yearly ? "Yearly" : "Monthly"}`,
    terms: oneTime
      ? "all features · one payment · does not renew"
      : `all features · renews ${yearly ? "yearly" : "monthly"} · cancel any time`,
    amount: plan.amount,
    offer: offerOf(plan, per),
    currency: plan.currency,
    kind: plan.billing,
    per,
    action: {
      label: oneTime ? "Buy lifetime" : `Subscribe ${yearly ? "annually" : "monthly"}`,
      href: `${APP_URL}/billing?plan=${encodeURIComponent(plan.code)}`,
    },
  };
}

/**
 * The tiers, for a server component to hand its page. The plans are public and
 * read again at most every five minutes; the API does not answer this site's
 * origin from the browser (CORS is off unless configured), so they are read
 * here only. An API that does not answer leaves the authored rows.
 */
export async function getTiers(): Promise<Tier[]> {
  try {
    const res = await fetch(`${APP_URL}/api/v1/plans`, { next: { revalidate: 300 } });
    if (!res.ok) return TIERS;
    const plans = ((await res.json()) as { data?: Plan[] }).data;
    return plans?.length ? [...FREE_TIERS, ...plans.map(fromPlan)] : TIERS;
  } catch {
    return TIERS;
  }
}
