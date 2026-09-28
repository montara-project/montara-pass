import { Reveal } from "./_components/reveal";
import { VaultMockup } from "./_components/vault-mockup";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  GlobeIcon,
  KeyRoundIcon,
  LockIcon,
  ScanIcon,
  ShareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  UsersIcon,
  WifiOffIcon,
} from "./_components/icons";

/* ---------- Shared bits ---------- */

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-mist">
      <CheckIcon className="mt-0.5 size-4 shrink-0 text-accent-bright" />
      <span>{children}</span>
    </li>
  );
}

/* ---------- Hero ---------- */

const trustChips = [
  { icon: LockIcon, label: "XChaCha20 end-to-end encryption" },
  { icon: ShieldCheckIcon, label: "Independently audited" },
  { icon: GlobeIcon, label: "Works offline" },
];

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(60%_80%_at_50%_0%,rgba(30,58,95,0.55),transparent)] light:bg-[radial-gradient(60%_80%_at_50%_0%,rgba(30,58,95,0.08),transparent)]"
      />
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs font-semibold text-accent-soft">
              <ShieldCheckIcon className="size-3.5" />
              Zero-knowledge password manager
            </p>
            <h1 className="mt-6 font-heading text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Your passwords, locked in a vault{" "}
              <span className="text-accent-bright">only you can open.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-mist">
              Montara Pass stores, generates, and autofills every login — protected by end-to-end
              encryption that keeps your data invisible to everyone, including us. On every device
              you own.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#pricing"
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-[#04150e] transition-colors duration-200 hover:bg-accent-bright"
              >
                Get Montara Pass — it&rsquo;s free
                <ArrowRightIcon className="size-4" />
              </a>
              <a
                href="#features"
                className="cursor-pointer rounded-xl border border-line bg-card px-6 py-3.5 text-sm font-semibold text-fg transition-colors duration-200 hover:border-mist/40 hover:bg-card-hover"
              >
                See how it works
              </a>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
              {trustChips.map((chip) => (
                <li key={chip.label} className="flex items-center gap-2 text-xs font-medium text-mist">
                  <chip.icon className="size-4 text-accent-bright" />
                  {chip.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:pl-4">
            <VaultMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Social proof + platforms ---------- */

const brands = ["Northwind", "Atlas Labs", "Bluefin & Co", "Helios", "Cascade", "Driftwood"];

const platforms = [
  "Chrome",
  "Safari",
  "Firefox",
  "Edge",
  "iOS",
  "Android",
  "macOS",
  "Windows",
  "Linux",
];

function SocialProof() {
  return (
    <section className="border-y border-line bg-abyss/60">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-mist">
          Trusted by 2M+ people and 38,000 teams worldwide
        </p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-14">
          {brands.map((brand) => (
            <li key={brand} className="font-heading text-lg font-semibold text-mist/50 transition-colors duration-200 hover:text-mist">
              {brand}
            </li>
          ))}
        </ul>
        <div className="mt-8 border-t border-line pt-6">
          <p className="text-center text-xs font-medium text-mist">Works everywhere you do</p>
          <ul className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {platforms.map((platform) => (
              <li
                key={platform}
                className="rounded-full border border-line bg-card/60 px-3.5 py-1.5 text-xs font-medium text-mist transition-colors duration-200 hover:border-mist/30 hover:text-fg"
              >
                {platform}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- Personal / Business split ---------- */

const audiences = [
  {
    icon: UsersIcon,
    kicker: "For you and your family",
    title: "Stay protected at home",
    body: "Unlimited passwords, passkeys, and secure notes — synced across your devices and shareable with the people you trust.",
    cta: "Start for free",
  },
  {
    icon: GlobeIcon,
    kicker: "For teams of every size",
    title: "Give your business a fighting chance",
    body: "Onboard employees in minutes, set password policies, and see weak credentials before attackers do. Centralized, auditable, zero-knowledge.",
    cta: "Explore business",
  },
];

function AudienceSplit() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-bright">
          Who it&rsquo;s for
        </p>
        <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          One vault at home. One for your whole team.
        </h2>
        <p className="mt-4 leading-7 text-mist">
          The same zero-knowledge architecture — whether you&rsquo;re protecting your family or
          rolling out across an organization.
        </p>
      </div>
      <Reveal className="mt-14">
        <div className="grid gap-6 md:grid-cols-2">
          {audiences.map((a) => (
            <article
              key={a.title}
              className="group flex flex-col rounded-2xl border border-line bg-card p-8 transition-colors duration-200 hover:border-mist/30 hover:bg-card-hover sm:p-10"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-accent/15 text-accent-bright">
                <a.icon className="size-6" />
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-accent-bright">{a.kicker}</p>
              <h3 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{a.title}</h3>
              <p className="mt-3 flex-1 leading-7 text-mist">{a.body}</p>
              <a
                href="#pricing"
                className="mt-6 inline-flex w-fit cursor-pointer items-center gap-1.5 text-sm font-semibold text-accent-soft transition-colors duration-200 hover:text-fg"
              >
                {a.cta}
                <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
              </a>
            </article>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Features ---------- */

const features = [
  {
    icon: SparklesIcon,
    title: "Autofill that just works",
    body: "Logins, forms, and payment details filled in a tap — accurately, on every browser and OS you use.",
  },
  {
    icon: KeyRoundIcon,
    title: "Unbreakable generator",
    body: "Create long, unique passwords and passphrases with one tap. Never reuse a password again.",
  },
  {
    icon: ScanIcon,
    title: "Data breach scanner",
    body: "Your vault is checked against known breaches around the clock, with instant alerts when your data surfaces.",
  },
  {
    icon: LockIcon,
    title: "Passkeys & 2FA built in",
    body: "Store passkeys and one-time codes right next to your logins. Stronger than SMS, simpler than separate apps.",
  },
  {
    icon: ShareIcon,
    title: "Secure sharing",
    body: "Share credentials with family or teammates through end-to-end encryption — never over email or chat again.",
  },
  {
    icon: WifiOffIcon,
    title: "Sync and offline access",
    body: "Your vault syncs across devices in real time and stays available offline. Your data never leaves your control.",
  },
];

function Features() {
  return (
    <section id="features" className="border-t border-line bg-abyss/40">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-bright">Features</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a password manager should do — and nothing it shouldn&rsquo;t
          </h2>
          <p className="mt-4 leading-7 text-mist">
            Six tools that quietly remove passwords from your list of things to worry about.
          </p>
        </div>

        <Reveal className="mt-14">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article
                key={f.title}
                className="rounded-2xl border border-line bg-card p-7 transition-colors duration-200 hover:border-mist/30 hover:bg-card-hover"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent-bright">
                  <f.icon className="size-5.5" />
                </span>
                <h3 className="mt-5 font-heading text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-mist">{f.body}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Security ---------- */

const stats = [
  { value: "2M+", label: "people and teams protected" },
  { value: "0", label: "data breaches. Ever." },
  { value: "180+", label: "countries using Montara Pass" },
  { value: "4.9★", label: "average rating across stores" },
];

const securityPoints = [
  {
    title: "Zero-knowledge by design",
    body: "Your vault is encrypted and decrypted on your device only. We never see, store, or could ever reconstruct your master password.",
  },
  {
    title: "Modern, audited cryptography",
    body: "XChaCha20 encryption with a 256-bit key, built on open-source, peer-reviewed libraries and hardened by external audits.",
  },
  {
    title: "Tested before attackers are",
    body: "Independent security audits, a public bug bounty program, and SOC 2 Type II reporting keep us honest — continuously.",
  },
];

function Security() {
  return (
    <section id="security" className="relative overflow-hidden border-t border-line">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_40%,rgba(30,58,95,0.4),transparent)] light:bg-[radial-gradient(50%_60%_at_50%_40%,rgba(30,58,95,0.06),transparent)]"
      />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <Reveal>
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent-bright">Security</p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Built so that not even we can read your data
              </h2>
              <p className="mt-4 max-w-lg leading-7 text-mist">
                Most services protect your data from other people. Montara Pass is architected so
                your data is protected from everyone — including Montara.
              </p>
              <ul className="mt-8 flex flex-col gap-6">
                {securityPoints.map((p) => (
                  <li key={p.title} className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-bright">
                      <ShieldCheckIcon className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-heading font-semibold">{p.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-mist">{p.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-line bg-card p-7 text-center transition-colors duration-200 hover:border-mist/30"
                >
                  <p className="font-heading text-4xl font-semibold text-accent-soft">{s.value}</p>
                  <p className="mt-2 text-sm leading-5 text-mist">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Pricing ---------- */

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "Everything you need to stop reusing passwords.",
    features: [
      "Unlimited passwords on 1 device",
      "Password generator",
      "Secure notes",
      "30-day breach alerts",
    ],
    cta: "Start for free",
    featured: false,
  },
  {
    name: "Premium",
    price: "$1.49",
    period: "per month, billed annually",
    blurb: "Full power across every device you own.",
    features: [
      "Everything in Free",
      "Unlimited devices & sync",
      "Autofill & passkeys",
      "Real-time breach scanner",
      "Secure sharing & 2FA codes",
    ],
    cta: "Go Premium",
    featured: true,
  },
  {
    name: "Families",
    price: "$3.49",
    period: "per month, billed annually",
    blurb: "Six premium vaults under one roof.",
    features: [
      "Everything in Premium",
      "6 premium accounts",
      "Shared family vault",
      "Centralized billing",
    ],
    cta: "Protect your family",
    featured: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="border-t border-line bg-abyss/40">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-bright">Pricing</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple pricing. Serious security.
          </h2>
          <p className="mt-4 leading-7 text-mist">
            Start free, upgrade when you want more. Every plan is protected by the same
            zero-knowledge architecture.
          </p>
        </div>

        <Reveal className="mt-14">
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  plan.featured
                    ? "border-accent/50 bg-card shadow-2xl shadow-accent/10 lg:-my-3 lg:py-11"
                    : "border-line bg-card"
                }`}
              >
                {plan.featured ? (
                  <p className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3.5 py-1 text-xs font-semibold text-[#04150e]">
                    Most popular
                  </p>
                ) : null}
                <h3 className="font-heading text-lg font-semibold">{plan.name}</h3>
                <p className="mt-4">
                  <span className="font-heading text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="ml-2 text-sm text-mist">{plan.period}</span>
                </p>
                <p className="mt-3 text-sm leading-6 text-mist">{plan.blurb}</p>
                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {plan.features.map((f) => (
                    <Check key={f}>{f}</Check>
                  ))}
                </ul>
                <a
                  href="#top"
                  className={`mt-8 flex cursor-pointer items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-colors duration-200 ${
                    plan.featured
                      ? "bg-accent text-[#04150e] hover:bg-accent-bright"
                      : "border border-line bg-transparent text-fg hover:border-mist/40 hover:bg-card-hover"
                  }`}
                >
                  {plan.cta}
                </a>
              </article>
            ))}
          </div>
        </Reveal>

        <p className="mt-10 text-center text-sm text-mist">
          Running a team?{" "}
          <a href="#top" className="cursor-pointer font-semibold text-accent-soft underline-offset-4 hover:underline">
            Talk to us about Business →
          </a>
        </p>
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */

const testimonials = [
  {
    quote:
      "We rolled Montara Pass out to 400 people in a week. Password reset tickets dropped by more than half in the first month.",
    name: "Priya Natarajan",
    role: "Head of IT, Atlas Labs",
  },
  {
    quote:
      "The breach scanner caught a leaked credential I'd been carrying around for years. That alone was worth the subscription.",
    name: "Daniel Okafor",
    role: "Freelance developer",
  },
  {
    quote:
      "My parents' logins finally live in one safe place, and I can help them without knowing their passwords. That's the whole trick.",
    name: "Sofia Marques",
    role: "Families plan user",
  },
];

function Testimonials() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex items-center justify-center gap-1" aria-label="Rated 4.9 out of 5">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon key={i} className="size-5 text-amber-300 light:text-amber-500" />
            ))}
          </div>
          <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Loved by people who were burned before
          </h2>
        </div>

        <Reveal className="mt-14">
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="flex flex-col rounded-2xl border border-line bg-card p-7">
                <blockquote className="flex-1 leading-7 text-fg/90">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-brand font-heading text-sm font-semibold text-accent-soft">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{t.name}</span>
                    <span className="block text-xs text-mist">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

const faqs = [
  {
    q: "What does “zero-knowledge” actually mean?",
    a: "It means your vault is encrypted on your device with a key derived from your master password. That key never leaves your device, and we never receive your master password — so no one at Montara, and no attacker breaching our servers, can read your data.",
  },
  {
    q: "Can I import passwords from my current manager or browser?",
    a: "Yes. Montara Pass imports CSV exports from all major password managers and browsers in one step, including Chrome, Safari, 1Password, Bitwarden, and LastPass. Most imports finish in under a minute.",
  },
  {
    q: "What happens if I forget my master password?",
    a: "Your master password is the only key to your vault, so we can't reset it for you — that's the trade-off of zero-knowledge security. You can recover your account through a recovery key you print at setup, or through a trusted emergency contact.",
  },
  {
    q: "Does Montara Pass work offline?",
    a: "Yes. Your vault is cached locally in an encrypted form, so you can view and autofill logins with no internet connection. Changes sync as soon as you're back online.",
  },
  {
    q: "Is the Free plan actually free?",
    a: "Yes — the Free plan is free forever, not a trial. It covers unlimited passwords on one device, the generator, secure notes, and 30-day breach alerts. We fund development through Premium and Business subscriptions.",
  },
  {
    q: "How does Montara Pass protect my business?",
    a: "Business adds centralized onboarding and offboarding, enforced password policies, an activity log, and a dashboard that surfaces weak or reused credentials across your whole team — while keeping each employee's vault zero-knowledge.",
  },
];

function Faq() {
  return (
    <section id="faq" className="border-t border-line bg-abyss/40">
      <div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-bright">FAQ</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Questions, answered
          </h2>
        </div>

        <Reveal className="mt-12">
          <div className="flex flex-col gap-3">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-line bg-card transition-colors duration-200 open:border-mist/30"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-heading font-semibold">
                  {item.q}
                  <ChevronDownIcon className="size-5 shrink-0 text-mist transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <p className="px-6 pb-6 text-sm leading-7 text-mist">{item.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */

function CtaBand() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-accent px-6 py-16 text-center sm:px-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(255,255,255,0.25),transparent)]"
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-heading text-3xl font-semibold tracking-tight text-[#04150e] sm:text-4xl">
                Ready to stop worrying about passwords?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[#04271c]">
                Set up your vault in under five minutes. Free forever plan, no credit card required.
              </p>
              <a
                href="#pricing"
                className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-ink px-7 py-3.5 text-sm font-semibold text-fg transition-colors duration-200 hover:bg-abyss"
              >
                Get Montara Pass
                <ArrowRightIcon className="size-4" />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Page ---------- */

export default function Home() {
  return (
    <main>
      <Hero />
      <SocialProof />
      <AudienceSplit />
      <Features />
      <Security />
      <Pricing />
      <Testimonials />
      <Faq />
      <CtaBand />
    </main>
  );
}
