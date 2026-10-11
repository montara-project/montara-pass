import { ArrowRightIcon } from "@/components/icons";
import { Dim } from "@/components/shared";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-line">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_55%_at_50%_50%,color-mix(in_srgb,var(--color-accent)_24%,transparent),transparent)] light:bg-[radial-gradient(40%_55%_at_50%_50%,color-mix(in_srgb,var(--color-accent)_10%,transparent),transparent)]"
      />
      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
        <h2 className="text-balance font-heading text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          Run your own vault. <Dim>Keep your own keys.</Dim>
        </h2>
        <p className="mx-auto mt-7 max-w-xl text-balance text-lg leading-8 text-mist">
          One Compose file, one PostgreSQL database, one domain.
        </p>
        <a href="#self-host" className="btn btn-primary mt-9">
          Self-host
          <ArrowRightIcon className="size-4" />
        </a>
      </div>
    </section>
  );
}
