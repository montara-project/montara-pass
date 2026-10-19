import type { Metadata } from "next";

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
import { REPO_URL } from "@/components/links";
import { queries } from "@/lib/api/queries";
import { META_IMAGE, META_URL, pageMeta } from "@/lib/constants/meta";
import { getQueryClient } from "@/lib/providers/query-client";

export const metadata: Metadata = pageMeta({ path: "/" });

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Montara Pass",
  url: META_URL,
  description:
    "A secure, open-source, zero-knowledge password manager. Logins are encrypted in the browser with Argon2id, AES-256-GCM and RSA-OAEP; the server stores only ciphertext.",
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web, Chrome, Firefox",
  license: "https://opensource.org/licenses/MIT",
  codeRepository: REPO_URL,
  image: `${META_URL}${META_IMAGE}`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: {
    "@type": "Organization",
    name: "Montara Project",
    url: META_URL,
    logo: `${META_URL}${META_IMAGE}`,
    sameAs: [REPO_URL],
  },
};

export default async function Home() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(queries.billing.plans());

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
