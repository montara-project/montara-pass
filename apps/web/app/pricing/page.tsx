import type { Metadata } from "next";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { PricingPage } from "@/components/pricing/pricing-page";
import { queries } from "@/lib/api/queries";
import { getQueryClient } from "@/lib/providers/query-client";

export const metadata: Metadata = {
  title: "Pricing — Montara Pass",
  description:
    "Self-host Montara Pass for nothing, keep a free Cloud account, or pay for Pro at $3 a month, $25 a year or $300 once. The encryption is the same on every tier.",
};

export default async function Page() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(queries.billing.plans());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PricingPage />
    </HydrationBoundary>
  );
}
