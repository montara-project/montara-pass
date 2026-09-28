import type { Metadata } from "next";
import { ContactForm } from "../_components/contact-form";
import {
  AlertTriangleIcon,
  ClockIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  MessageSquareIcon,
  ScanIcon,
  ShieldCheckIcon,
} from "../_components/icons";

export const metadata: Metadata = {
  title: "Contact — Montara Pass",
  description:
    "Reach the Montara Pass team: product support, security disclosure, business and sales, or press. We reply within one business day.",
};

const channels = [
  {
    icon: MessageSquareIcon,
    title: "Product support",
    email: "support@montarapass.com",
    body: "Account access, syncing, autofill, billing — anything about using Montara Pass day to day.",
    response: "Replies within 1 business day",
  },
  {
    icon: ScanIcon,
    title: "Security disclosure",
    email: "security@montarapass.com",
    body: "Report a vulnerability or a suspected breach. Good-faith reports are always welcome — and never met with legal action.",
    response: "Acknowledged within 24 hours",
  },
  {
    icon: GlobeIcon,
    title: "Business and sales",
    email: "sales@montarapass.com",
    body: "Business plans, volume pricing, procurement, and security reviews for your IT and compliance teams.",
    response: "Replies within 2 business days",
  },
  {
    icon: MailIcon,
    title: "Press and media",
    email: "press@montarapass.com",
    body: "Interviews, commentary on password security, brand assets, and everything else for journalists.",
    response: "Replies within 2 business days",
  },
];

export default function ContactPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_70%_at_50%_0%,rgba(30,58,95,0.5),transparent)]"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs font-semibold text-accent-soft">
              <ShieldCheckIcon className="size-3.5" />
              Contact
            </p>
            <h1 className="mt-6 font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Talk to a <span className="text-accent-bright">human.</span>
            </h1>
            <p className="mt-5 leading-7 text-mist">
              Real people, not ticket mazes. Pick a channel below or send a message — we reply
              within one business day, usually much faster.
            </p>
            <p className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 text-xs font-medium text-accent-soft">
              <ShieldCheckIcon className="size-4 shrink-0" />
              We will never ask for your master password or recovery key.
            </p>
          </div>
        </div>
      </section>

      {/* Channels */}
      <section aria-label="Contact channels" className="border-b border-line bg-abyss/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {channels.map((channel) => (
              <article
                key={channel.title}
                className="flex flex-col rounded-2xl border border-line bg-card p-6 transition-colors duration-200 hover:border-mist/30 hover:bg-card-hover"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent-bright">
                  <channel.icon className="size-5" />
                </span>
                <h2 className="mt-5 font-heading text-base font-semibold">{channel.title}</h2>
                <a
                  href={`mailto:${channel.email}`}
                  className="mt-1 cursor-pointer break-all text-sm font-medium text-accent-soft underline-offset-4 hover:underline"
                >
                  {channel.email}
                </a>
                <p className="mt-3 flex-1 text-sm leading-6 text-mist">{channel.body}</p>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-mist/80">
                  <ClockIcon className="size-3.5" />
                  {channel.response}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section aria-label="Send a message" className="border-b border-line">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent-bright">
                Write to us
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight">
                Send a message
              </h2>
              <p className="mt-4 leading-7 text-mist">
                Tell us what you need — the more detail, the faster we can help.
              </p>
            </div>
            <div className="mt-10">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* Office + security disclosure */}
      <section aria-label="Office and security disclosure">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-2xl border border-line bg-card p-8">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent-bright">
              <MapPinIcon className="size-5" />
            </span>
            <h2 className="mt-5 font-heading text-lg font-semibold">Office</h2>
            <address className="mt-3 not-italic leading-7 text-mist">
              Montara Labs, Inc.
              <br />
              550 Kearny Street, Suite 400
              <br />
              San Francisco, CA 94108
            </address>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-mist/80">
              <ClockIcon className="size-3.5" />
              Monday to Friday, 9am–6pm Pacific
            </p>
          </div>

          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-8">
            <span className="flex size-11 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <AlertTriangleIcon className="size-5" />
            </span>
            <h2 className="mt-5 font-heading text-lg font-semibold">Found a security issue?</h2>
            <p className="mt-3 text-sm leading-6 text-mist">
              Email{" "}
              <a
                href="mailto:security@montarapass.com"
                className="cursor-pointer font-medium text-accent-soft underline-offset-4 hover:underline"
              >
                security@montarapass.com
              </a>{" "}
              with the details. We acknowledge reports within 24 hours, keep researchers informed
              through the fix, and never take legal action against good-faith disclosure.
            </p>
            <p className="mt-4 text-xs leading-5 text-mist/80">
              Please don&rsquo;t include vault contents in reports — the vault is encrypted
              end-to-end, so we couldn&rsquo;t read them anyway.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
