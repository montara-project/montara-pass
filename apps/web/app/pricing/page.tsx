import type { Metadata } from "next";

import { getTiers } from "@/components/pricing/offer";
import { PricingPage } from "@/components/pricing/pricing-page";
import { pageMeta } from "@/lib/constants/meta";

export const metadata: Metadata = pageMeta({
  title: "Password Manager Pricing, Free or $3 a Month",
  description:
    "Self-host the Montara Pass password manager for free, keep a free Cloud account, or get Pro for $3 a month, $25 a year or $300 once. Same encryption on every tier.",
  path: "/pricing",
});

export default async function Page() {
  return <PricingPage tiers={await getTiers()} />;
}
