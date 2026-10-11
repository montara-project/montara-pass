import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import {
  AlertTriangleIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  MessageSquareIcon,
  ScanIcon,
} from "@/components/icons";
import { card, Dim, IconTile, Statement } from "@/components/shared";

export const metadata: Metadata = {
  title: "Contact — Montara Pass",
  description:
    "Reach the Montara Pass team: product support, security disclosure, business and sales, or press. We reply within one business day.",
};

const channels = [
  {
    icon: MessageSquareIcon,
    title: "Product support",
    email: "hello@montaraproject.com",
    body: "Account access, syncing, autofill, billing — anything about using Montara Pass day to day.",
    response: "Replies within 1 business day",
  },
  {
    icon: ScanIcon,
    title: "Security disclosure",
    email: "hello@montaraproject.com",
    body: "Report a vulnerability or a suspected breach. Good-faith reports are always welcome — and never met with legal action.",
    response: "Acknowledged within 24 hours",
  },
  {
    icon: GlobeIcon,
    title: "Business and sales",
    email: "hello@montaraproject.com",
    body: "Business plans, volume pricing, procurement, and security reviews for your IT and compliance teams.",
    response: "Replies within 2 business days",
  },
  {
    icon: MailIcon,
    title: "Press and media",
    email: "hello@montaraproject.com",
    body: "Interviews, commentary on password security, brand assets, and everything else for journalists.",
    response: "Replies within 2 business days",
  },
];

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

      {/* Channels */}
      <section
        aria-label="Contact channels"
        className="grid gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-4"
      >
        {channels.map((channel) => (
          <article key={channel.title} className="flex flex-col bg-ink p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <IconTile icon={channel.icon} />
              <h2 className="font-medium">{channel.title}</h2>
            </div>
            <a
              href={`mailto:${channel.email}`}
              className="mt-4 cursor-pointer break-all font-mono text-xs text-fg underline-offset-4 hover:underline"
            >
              {channel.email}
            </a>
            <p className="mt-3 flex-1 text-[15px] leading-7 text-mist">{channel.body}</p>
            <p className="mt-5 font-mono text-xs lowercase text-mist">{channel.response}</p>
          </article>
        ))}
      </section>

      {/* Form */}
      <section aria-label="Send a message" className="border-t border-line pb-20 sm:pb-28">
        <Statement
          title={
            <>
              Send a message. <Dim>Skip the ticket maze.</Dim>
            </>
          }
        >
          Tell us what you need. The more detail, the faster we can help.
        </Statement>
        <div className="mx-auto -mt-8 max-w-2xl px-6">
          <ContactForm />
        </div>
      </section>

      {/* Office + security disclosure */}
      <section
        aria-label="Office and security disclosure"
        className="border-t border-line px-6 py-20 sm:py-24"
      >
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          <div className={card}>
            <div className="flex items-center gap-3">
              <IconTile icon={MapPinIcon} />
              <h2 className="font-medium">Office</h2>
            </div>
            <address className="mt-5 text-[15px] not-italic leading-7 text-mist">
              Montara Project
              <br />
              Semarang, Indonesia
            </address>
            <p className="mt-4 font-mono text-xs lowercase text-mist">
              monday to friday, 9am–6pm wib
            </p>
          </div>

          <div className={card}>
            <div className="flex items-center gap-3">
              <IconTile icon={AlertTriangleIcon} />
              <h2 className="font-medium">Found a security issue?</h2>
            </div>
            <p className="mt-5 text-[15px] leading-7 text-mist">
              Email{" "}
              <a
                href="mailto:hello@montaraproject.com"
                className="cursor-pointer font-medium text-fg underline-offset-4 hover:underline"
              >
                hello@montaraproject.com
              </a>{" "}
              with the details. We acknowledge reports within 24 hours, keep researchers informed
              through the fix, and never take legal action against good-faith disclosure.
            </p>
            <p className="mt-4 font-mono text-xs leading-5 text-mist">
              Leave vault contents out of reports. They are encrypted end-to-end, so we could not
              read them anyway.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
