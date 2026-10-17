import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { Explainer } from "@/components/home/explainer";
import { Faq } from "@/components/home/faq";
import { FeatureMatrix } from "@/components/home/feature-matrix";
import { FinalCta } from "@/components/home/final-cta";
import { Hero } from "@/components/home/hero";
import { Ownership } from "@/components/home/ownership";
import { Pricing } from "@/components/home/pricing";
import { Steps } from "@/components/home/steps";
import { TrustStrip } from "@/components/home/trust-strip";
import { queries } from "@/lib/api/queries";
import { getQueryClient } from "@/lib/providers/query-client";

export default async function Home() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(queries.billing.plans());

  return (
    <main>
      <Hero />
      <TrustStrip />
      <Explainer />
      <FeatureMatrix />
      <Ownership />
      <Steps />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Pricing />
      </HydrationBoundary>
      <Faq />
      <FinalCta />
    </main>
  );
}
