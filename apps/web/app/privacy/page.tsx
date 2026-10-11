import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Montara Pass",
  description:
    "What Montara Pass collects, what it can never see, and how your data is protected by a zero-knowledge architecture. Written to be read, not skimmed.",
};

const updated = "September 28, 2026";

const sections: LegalSection[] = [
  {
    id: "privacy-at-a-glance",
    title: "Privacy at a glance",
    paragraphs: [
      "Montara Pass is built so that your vault is encrypted on your device and can only be decrypted there. Your master password never reaches our servers, and the data we do hold about your account is limited to what is needed to run the Service.",
      "This policy explains what we collect, what we can never see, and the choices you have. The short version: we collect the minimum, we sell nothing, and your vault content is invisible to everyone — including us.",
    ],
  },
  {
    id: "data-we-collect",
    title: "Data we collect",
    paragraphs: ["We keep this list short, because keeping it short is the point:"],
    bullets: [
      "Account data: your email address and, if you choose to add one, your name.",
      "Billing data: plan, invoices, and the last four digits of your card — payment details are handled by our payment processor and never touch our servers in full.",
      "Technical data: device type, operating system, app version, and crash reports, used to keep the apps working.",
      "Product usage: aggregated, anonymized events such as \u201cautofill used\u201d — never the content of a login, note, or vault item.",
    ],
  },
  {
    id: "what-we-cannot-see",
    title: "What we can never see",
    paragraphs: [
      "Your vault is encrypted on your device with XChaCha20 using a key derived from your master password. That key is never transmitted, stored, or reconstructable by us.",
      "Practically, this means we cannot see your passwords, passkeys, secure notes, attachments, or vault metadata such as item titles and URLs. If our servers were compromised, an attacker would obtain only encrypted blobs — not your data.",
    ],
  },
  {
    id: "how-we-use-data",
    title: "How we use your data",
    bullets: [
      "To provide the Service: accounts, syncing encrypted vaults between your devices, and support.",
      "To keep the Service secure: fraud prevention, abuse detection, and security monitoring.",
      "To improve the Service: aggregated product analytics that never include vault content.",
      "To communicate with you: transactional email such as receipts, security notices, and breach alerts you have enabled.",
      "To comply with the law where required.",
    ],
  },
  {
    id: "legal-bases",
    title: "Legal bases for processing",
    paragraphs: [
      "For users in the EU, UK, and Switzerland, we process account and billing data to perform our contract with you (Art. 6(1)(b) GDPR), technical and security data under our legitimate interests in operating a secure service (Art. 6(1)(f)), and optional communications only with your consent (Art. 6(1)(a)), which you can withdraw at any time.",
    ],
  },
  {
    id: "sharing-and-processors",
    title: "Sharing and processors",
    paragraphs: [
      "We do not sell your data, we do not run advertising, and we do not share data with data brokers. We share data only with the processors needed to run the Service:",
    ],
    bullets: [
      "Hosting providers, to run the sync infrastructure that stores your encrypted vault.",
      "A payment processor, to handle subscriptions and invoices.",
      "An email delivery provider, to send transactional email such as receipts and security alerts.",
      "An error-monitoring provider, to receive crash reports — scrubbed of personal data where possible.",
    ],
    footnote:
      "We may also disclose information if the law requires it. Because vault data is encrypted end-to-end, the most we could ever produce in response to a request is encrypted vault data and basic account metadata — never readable passwords.",
  },
  {
    id: "data-retention-and-deletion",
    title: "Data retention and deletion",
    paragraphs: [
      "When you delete your account, your account data is removed within 30 days, and it is purged from encrypted backups within 90 days. Your encrypted vault data becomes permanently unrecoverable — by design, there is no copy we can restore.",
      "We keep the minimum data required for tax and fraud-prevention obligations for as long as the law requires, then delete it.",
    ],
  },
  {
    id: "your-rights",
    title: "Your rights",
    paragraphs: [
      "Wherever you live, you can access, correct, export, or delete your personal data from your account settings. If you are in the EU, UK, or California, you additionally have the rights to object to processing, restrict processing, and opt out of any \u201csale\u201d or \u201csharing\u201d of personal information — which, for Montara Pass, is moot: we never sell or share personal information for advertising.",
      "To exercise a right or file a complaint, contact hello@montaraproject.com. We respond within 30 days.",
    ],
  },
  {
    id: "international-transfers",
    title: "International data transfers",
    paragraphs: [
      "Our infrastructure is hosted in the United States and the European Union. Where data is transferred out of the EU or UK, we rely on the European Commission\u2019s Standard Contractual Clauses and equivalent safeguards, and we encrypt data in transit and at rest.",
    ],
  },
  {
    id: "childrens-privacy",
    title: "Children\u2019s privacy",
    paragraphs: [
      "Montara Pass is not intended for children under 16, and we do not knowingly collect their personal data. Families plan administrators are responsible for any supervised vaults they create for younger family members.",
    ],
  },
  {
    id: "cookies-and-tracking",
    title: "Cookies and tracking",
    paragraphs: [
      "Our website and apps use only strictly necessary cookies and local storage: keeping you signed in, remembering preferences, and protecting against fraud. We do not use advertising cookies, cross-site trackers, or fingerprinting.",
    ],
  },
  {
    id: "changes-and-contact",
    title: "Changes and contact",
    paragraphs: [
      "If we make a material change to this policy, we will notify you by email or in-app notice at least 30 days before it takes effect, and we will update the date above.",
      "Questions about privacy can be sent to hello@montaraproject.com, or by mail to Montara Project, Semarang, Indonesia.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated={updated}
      intro="Montara Pass is zero-knowledge, and this policy is written the same way: plainly. It covers what we collect, what we can never see, and the rights you have."
      sections={sections}
    />
  );
}
