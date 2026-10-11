import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — Montara Pass",
  description:
    "The terms that govern your use of Montara Pass: accounts, billing, acceptable use, liability, and how changes to the service are handled.",
};

const updated = "September 28, 2026";

const sections: LegalSection[] = [
  {
    id: "accepting-these-terms",
    title: "Accepting these terms",
    paragraphs: [
      "These Terms of Service are an agreement between you and Montara Project (\u201cMontara\u201d, \u201cwe\u201d, \u201cus\u201d) and govern your use of the Montara Pass apps, browser extensions, and related services (the \u201cService\u201d).",
      "By creating an account or using the Service, you agree to these Terms and to our Privacy Policy. If you use the Service on behalf of an organization, you confirm that you have authority to bind that organization.",
    ],
  },
  {
    id: "eligibility-and-accounts",
    title: "Eligibility and accounts",
    paragraphs: [
      "You must be at least 16 years old to create a Montara Pass account. You are responsible for the accuracy of the information you provide, for keeping your account details up to date, and for all activity under your account.",
      "One account is for one person. Sharing vault items with other people happens through the sharing features — never by sharing your credentials.",
    ],
  },
  {
    id: "master-password",
    title: "Your master password and recovery key",
    paragraphs: [
      "Montara Pass is zero-knowledge: your vault is encrypted on your device with a key derived from your master password, and that key never leaves your device. We do not receive your master password and have no way to reconstruct it.",
      "That is a security feature, and it comes with a responsibility on your side:",
    ],
    bullets: [
      "If you forget your master password and have not set up a recovery key or emergency contact, no one — including us — can recover your vault.",
      "Never share your master password or recovery key with anyone. Montara employees will never ask for them.",
    ],
  },
  {
    id: "subscriptions-and-billing",
    title: "Subscriptions and billing",
    paragraphs: [
      "The Free plan is free forever, not a trial. Paid plans are billed in advance on a monthly or annual basis and renew automatically until canceled. You can cancel at any time from your account settings; cancellation takes effect at the end of the current billing period.",
      "If we make a material change to a paid plan\u2019s price, we will notify you at least 30 days before it takes effect, and you may cancel before the change applies to you.",
    ],
  },
  {
    id: "business-plans",
    title: "Business plans",
    paragraphs: [
      "For Business subscriptions, the subscribing organization controls member provisioning, vault policies, and deprovisioning, and is responsible for obtaining any consents required from members for the features it enables.",
      "Administrators can enforce password policies and view team security dashboards, but member vaults remain zero-knowledge — administrators cannot read vault content.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    paragraphs: ["You agree not to misuse the Service. Specifically, you will not:"],
    bullets: [
      "use the Service for unlawful purposes or to store or share content that is unlawful, infringing, or malicious;",
      "probe, scan, or test the Service\u2019s security without our written permission, or interfere with its operation;",
      "resell, sublicense, or provide the Service to third parties as a managed service without a separate agreement;",
      "misrepresent your identity or impersonate Montara staff.",
    ],
  },
  {
    id: "your-content",
    title: "Your content",
    paragraphs: [
      "Everything you store in your vault — passwords, passkeys, notes, and attachments — belongs to you. You grant us only the limited rights needed to store, sync, and deliver that content as encrypted data at your direction.",
      "Because the Service is zero-knowledge, we cannot read or review the contents of your vault, and we do not moderate it. You are responsible for what you store.",
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    paragraphs: [
      "The Service, including its software, design, branding, and documentation, is owned by Montara Project and protected by intellectual property laws. We grant you a personal, non-exclusive, non-transferable license to use the apps for their intended purpose while your account is in good standing.",
      "If you send us feedback or suggestions, you grant us a perpetual, royalty-free license to use them to improve the Service, without obligation or attribution.",
    ],
  },
  {
    id: "suspension-and-termination",
    title: "Suspension and termination",
    paragraphs: [
      "You may stop using the Service and delete your account at any time. Deleting your account removes your encrypted vault data as described in the Privacy Policy — export anything you want to keep first.",
      "We may suspend or terminate accounts that violate these Terms or create legal risk for us or others. Where practical, we will notify you and give you a reasonable window to export your data first.",
    ],
  },
  {
    id: "disclaimers-and-liability",
    title: "Disclaimers and limitation of liability",
    paragraphs: [
      "The Service is provided \u201cas is\u201d and \u201cas available\u201d, except as required by applicable law. Montara Pass is a security tool, not legal, financial, or professional advice, and no system can guarantee absolute security.",
      "To the maximum extent permitted by law, Montara\u2019s total liability arising out of or relating to the Service is limited to the amounts you paid us in the 12 months before the event giving rise to the claim. Nothing in these Terms limits liability that cannot be limited by law.",
    ],
  },
  {
    id: "changes-to-these-terms",
    title: "Changes to these terms",
    paragraphs: [
      "We may update these Terms as the Service evolves. For material changes, we will notify you by email or in-app notice at least 30 days before they take effect.",
      "Continuing to use the Service after a change takes effect means you accept the updated Terms. If you do not agree with a change, you can delete your account and stop using the Service.",
    ],
  },
  {
    id: "contact-us",
    title: "Contact us",
    paragraphs: [
      "Questions about these Terms can be sent to hello@montarapass.com, or by mail to Montara Project, Semarang, Indonesia.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      updated={updated}
      intro="These Terms govern your use of Montara Pass. They are written to be read — but if anything is unclear, contact us and we will explain it."
      sections={sections}
    />
  );
}
