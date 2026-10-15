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

/** A plan as the API serves it (`apps/server` internal/models/billing.go). */
type Plan = {
  code: string;
  name: string;
  billing: "recurring" | "one_time";
  billing_interval: "month" | "year" | null;
  amount: number;
  currency: string;
};

const FREE_TIERS = TIERS.filter((tier) => tier.kind === "free");

/** A live plan as a tape row. */
function fromPlan(plan: Plan): Tier {
  const oneTime = plan.billing === "one_time";
  const yearly = plan.billing_interval === "year";
  return {
    code: plan.code,
    name: plan.name,
    terms: oneTime
      ? "all features · one payment · does not renew"
      : `all features · renews ${yearly ? "yearly" : "monthly"} · cancel any time`,
    amount: plan.amount,
    currency: plan.currency,
    kind: plan.billing,
    per: oneTime ? "once" : yearly ? "/ year" : "/ month",
    chip: oneTime ? "all features, for good" : "all features",
    action: {
      label: oneTime ? "Buy lifetime" : `Subscribe ${yearly ? "annually" : "monthly"}`,
      href: `${APP_URL}/billing?plan=${encodeURIComponent(plan.code)}`,
    },
  };
}

export async function tiersOnOffer(): Promise<Tier[]> {
  try {
    const res = await fetch(`${APP_URL}/api/v1/plans`, { next: { revalidate: 300 } });
    if (!res.ok) return TIERS;
    const body = (await res.json()) as { data?: Plan[] };
    const plans = body.data ?? [];
    if (plans.length === 0) return TIERS;
    return [...FREE_TIERS, ...plans.map(fromPlan)];
  } catch {
    return TIERS;
  }
}
