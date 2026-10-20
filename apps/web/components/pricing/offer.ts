import { APP_URL } from "@/components/links";
import { type Tier, TIERS } from "@/components/pricing/plans";

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
}

const FREE_TIERS = TIERS.filter((tier) => tier.kind === "free");

/** A live plan as a tape row. */
function fromPlan(plan: Plan): Tier {
  const oneTime = plan.billing === "one_time";
  const yearly = plan.billing_interval === "year";
  return {
    code: plan.code,
    // The API's names carry the product and the store's environment
    // ("Montara Pass Pro Monthly - Sandbox"); the tape names the tier alone.
    name: `Pro ${oneTime ? "Lifetime" : yearly ? "Yearly" : "Monthly"}`,
    terms: oneTime
      ? "all features · one payment · does not renew"
      : `all features · renews ${yearly ? "yearly" : "monthly"} · cancel any time`,
    amount: plan.amount,
    currency: plan.currency,
    kind: plan.billing,
    per: oneTime ? "once" : yearly ? "/ year" : "/ month",
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
