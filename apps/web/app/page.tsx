import { Explainer } from "@/components/home/explainer";
import { Faq } from "@/components/home/faq";
import { FeatureMatrix } from "@/components/home/feature-matrix";
import { FinalCta } from "@/components/home/final-cta";
import { Hero } from "@/components/home/hero";
import { Ownership } from "@/components/home/ownership";
import { Pricing } from "@/components/home/pricing";
import { Steps } from "@/components/home/steps";
import { TrustStrip } from "@/components/home/trust-strip";

export default function Home() {
  return (
    <main>
      <Hero />
      <TrustStrip />
      <Explainer />
      <FeatureMatrix />
      <Ownership />
      <Steps />
      <Pricing />
      <Faq />
      <FinalCta />
    </main>
  );
}
