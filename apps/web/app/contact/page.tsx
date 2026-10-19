import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import {
  BuildingIcon,
  ClockIcon,
  LifeBuoyIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  NewspaperIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import { card, Dim, Statement } from "@/components/shared";
import { pageMeta } from "@/lib/constants/meta";

export const metadata: Metadata = pageMeta({
  title: "Contact Support and Security",
  description:
    "Reach the Montara Pass team: product support, security disclosure, business and sales, or press. We reply within one business day.",
  path: "/contact",
});

const channels = [
  {
    icon: LifeBuoyIcon,
    title: "Product support",
    email: "hello@montarapass.com",
    body: "Account access, syncing, autofill, billing — anything about using Montara Pass day to day.",
    response: "Replies within 1 business day",
  },
  {
    icon: ShieldAlertIcon,
    title: "Security disclosure",
    email: "hello@montarapass.com",
    body: "Report a vulnerability or a suspected breach. Good-faith reports are always welcome — and never met with legal action.",
    response: "Acknowledged within 24 hours",
  },
  {
    icon: BuildingIcon,
    title: "Business and sales",
    email: "hello@montarapass.com",
    body: "Business plans, volume pricing, procurement, and security reviews for your IT and compliance teams.",
    response: "Replies within 2 business days",
  },
  {
    icon: NewspaperIcon,
    title: "Press and media",
    email: "hello@montarapass.com",
    body: "Interviews, commentary on password security, brand assets, and everything else for journalists.",
    response: "Replies within 2 business days",
  },
];

/** An accent icon in a tinted tile, at the top of every card on the page. */
function Tile({ icon: Icon }: { icon: typeof MailIcon }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent-bright">
      <Icon className="size-4" />
    </span>
  );
}

/** A card's foot: a rule, then an accent icon beside a mono line. */
const foot = "mt-auto flex items-start gap-2 border-t border-line pt-4 font-mono text-xs leading-5";

export default function ContactPage() {
  return (
    <main>
      <Statement
        as="h1"
        title={
          <>
            Talk to <Dim>a human.</Dim>
          </>
        }
      >
        Pick a channel below or send a message. We reply within one business day, and we will never
        ask for your master password.
      </Statement>

      <section aria-label="Contact channels" className="grid gap-6 px-6 sm:grid-cols-2">
        {channels.map((channel) => (
          <article key={channel.title} className={`${card} flex flex-col`}>
            <div className="flex items-start justify-between gap-4">
              <Tile icon={channel.icon} />
              <p className="pt-2 text-right font-mono text-xs lowercase tracking-wide text-mist">
                {channel.response}
              </p>
            </div>
            <h2 className="mt-4 text-lg font-medium">{channel.title}</h2>
            <p className="mt-2 mb-8 text-[15px] leading-7 text-mist">{channel.body}</p>
            <p className={foot}>
              <MailIcon className="mt-0.5 size-3.5 shrink-0 text-accent-bright" />
              <a
                href={`mailto:${channel.email}`}
                className="cursor-pointer break-all text-fg underline-offset-4 hover:underline"
              >
                {channel.email}
              </a>
            </p>
          </article>
        ))}
      </section>

      <section
        aria-label="Send a message"
        className="mt-20 border-t border-line pb-20 sm:mt-28 sm:pb-28"
      >
        <Statement title="Send a message. Skip the ticket maze.">
          Tell us what you need. The more detail, the faster we can help.
        </Statement>
        <div className="mx-auto -mt-8 max-w-2xl px-6">
          <div className={card}>
            <ContactForm />
          </div>
        </div>
      </section>

      <section
        aria-label="Office and security disclosure"
        className="grid gap-6 border-t border-line px-6 py-20 sm:py-24 md:grid-cols-2"
      >
        <article className={`${card} flex flex-col`}>
          <Tile icon={MapPinIcon} />
          <h2 className="mt-4 text-lg font-medium">Office</h2>
          <address className="mt-2 mb-8 text-[15px] not-italic leading-7 text-mist">
            Montara Project
            <br />
            Semarang, Indonesia
          </address>
          <p className={`${foot} lowercase text-mist`}>
            <ClockIcon className="mt-0.5 size-3.5 shrink-0 text-accent-bright" />
            monday to friday, 9am–6pm wib
          </p>
        </article>

        <article className={`${card} flex flex-col`}>
          <Tile icon={ShieldCheckIcon} />
          <h2 className="mt-4 text-lg font-medium">Found a security issue?</h2>
          <p className="mt-2 mb-8 text-[15px] leading-7 text-mist">
            Email{" "}
            <a
              href="mailto:hello@montarapass.com"
              className="cursor-pointer text-fg underline-offset-4 hover:underline"
            >
              hello@montarapass.com
            </a>{" "}
            with the details. We acknowledge reports within 24 hours, keep researchers informed
            through the fix, and never take legal action against good-faith disclosure.
          </p>
          <p className={`${foot} text-mist/80`}>
            <LockIcon className="mt-0.5 size-3.5 shrink-0 text-accent-bright" />
            Leave vault contents out of reports. They are encrypted end-to-end, so we could not read
            them anyway.
          </p>
        </article>
      </section>
    </main>
  );
}
