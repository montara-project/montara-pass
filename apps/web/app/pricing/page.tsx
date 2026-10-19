import type { Metadata } from "next";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { PricingPage } from "@/components/pricing/pricing-page";
import { queries } from "@/lib/api/queries";
import { pageMeta } from "@/lib/constants/meta";
import { getQueryClient } from "@/lib/providers/query-client";

export const metadata: Metadata = pageMeta({
  title: "Password Manager Pricing, Free or $3 a Month",
  description:
    "Self-host the Montara Pass password manager for free, keep a free Cloud account, or get Pro for $3 a month, $25 a year or $300 once. Same encryption on every tier.",
  path: "/pricing",
});

export default async function Page() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(queries.billing.plans());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PricingPage />
    </HydrationBoundary>
  );
}
