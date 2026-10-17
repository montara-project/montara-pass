import { useQuery } from "@tanstack/react-query";

import type { Models } from "@/lib/api/models";

import { APP_URL } from "@/components/links";
import { type Tier, TIERS } from "@/components/pricing/plans";
import { queries } from "@/lib/api/queries";

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

const FREE_TIERS = TIERS.filter((tier) => tier.kind === "free");

/** A live plan as a tape row. */
function fromPlan(plan: Models.Plan): Tier {
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

/** For client components under a route that prefetched `queries.billing.plans()`. */
export function useTiers(): Tier[] {
  const { data: plans } = useQuery(queries.billing.plans());
  if (!plans?.length) return TIERS;
  return [...FREE_TIERS, ...plans.map(fromPlan)];
}
