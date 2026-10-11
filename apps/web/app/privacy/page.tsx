import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Montara Pass",
  description:
    "What Montara Pass stores about your account, what it cannot read, and who else handles your data. Covers the website, the hosted service and the browser extension.",
};

const updated = "October 11, 2026";

const sections: LegalSection[] = [
  {
    id: "privacy-at-a-glance",
    title: "Privacy at a glance",
    paragraphs: [
      "Montara Pass encrypts your vault in your browser before anything leaves your device. Our server stores ciphertext and wrapped keys. Your master password never reaches it, so we cannot read what is in your vault and we cannot recover it for you.",
      "This policy covers the website at montarapass.com, the hosted service at app.montarapass.com and the Montara Pass browser extension. We run no advertising, sell no data and collect no usage analytics from the vault or the extension.",
    ],
    footnote:
      "Montara Pass can also be self-hosted. If you use a server run by someone else, or your own, that operator holds the data described here and this policy does not apply to it. We receive nothing from a self-hosted server.",
  },
  {
    id: "data-we-store",
    title: "What we store about your account",
    paragraphs: ["Creating an account on the hosted service stores the following on our server:"],
    bullets: [
      "Your name and email address. If you sign in with Google, also the address of your Google profile picture.",
      "Your sign-in password, as an Argon2id hash. It is separate from your master password, which we never receive.",
      "Your sign-in sessions, each with the IP address and browser user agent it was started from.",
      "Your key set: the salt and settings used to derive your master key, your public key, and your vault key and private key in encrypted form.",
      "Your vault: items and folder names as ciphertext.",
      "A few facts about each item that stay readable so the apps can work: its type (such as login or secure note), when it was created and changed, whether it is in the trash, which of your folders it is in, and whether you marked it as a favorite.",
      "Sharing: which accounts an item is shared with, in which role, and who shared it.",
    ],
  },
  {
    id: "what-we-cannot-read",
    title: "What we cannot read",
    paragraphs: [
      "Your master password is turned into a key on your device with Argon2id. That key opens your vault key, which opens your private key, which opens one key per item. Items are encrypted with AES-256-GCM and item keys are wrapped with RSA-OAEP. Only the encrypted forms are sent to us.",
      "This means we cannot see the names, usernames, passwords, URLs or notes in your items, or the names of your folders. Someone who copied our database would get the same ciphertext we have.",
    ],
    footnote:
      "There is no recovery. If you forget your master password, nobody, including us, can open your vault.",
  },
  {
    id: "logs-and-errors",
    title: "Server logs and error reports",
    bullets: [
      "Request logs: for each request the server records the time, your IP address, the method and path, the response status and how long it took. Logs do not contain request bodies.",
      "Rate limiting: your IP address is counted in memory for one minute at a time to limit abusive traffic.",
      "Error reports: if the server crashes while handling a request, a report about that failure is sent to Sentry, our error-monitoring provider. Vault data in a request is already ciphertext.",
    ],
  },
  {
    id: "website",
    title: "The website",
    paragraphs: ["Visiting montarapass.com involves three things beyond serving the pages:"],
    bullets: [
      "Analytics: we count page views with Umami, which we host ourselves. It sets no cookies and builds no profile of you. It records the page, the referring site, and your browser, operating system, device type and country in aggregate.",
      "Fonts: the website and the web app load their fonts from Google Fonts, so Google receives your IP address and user agent when a page loads.",
      "Hosting: the website runs on Cloudflare, which processes your request, including your IP address, to deliver it.",
    ],
    footnote:
      "The contact form on the website does not send anything yet. To reach us, email hello@montarapass.com; we then hold your message and address for as long as the conversation needs.",
  },
  {
    id: "browser-extension",
    title: "The browser extension",
    paragraphs: [
      "The extension talks to the Montara Pass server you point it at. It sends your sign-in email and password to sign you in, and reads and writes your vault as ciphertext. It sends no telemetry and no browsing history, and nothing goes to us unless that server is ours.",
    ],
    bullets: [
      "Kept in the browser's local storage: the server address and your session tokens.",
      'When you fill a login into a page, the extension tells the server, which stores the time next to that item. It is how "last used" shows on your other devices; the server still cannot read the item.',
      "To show a site's icon next to a login, the extension asks that site for its icon once, when the login is saved, and keeps it inside the encrypted item. The request goes to the site itself, never to us or to an icon service, and carries no cookies and no referrer.",
      "Kept in memory only: your unlocked keys, cleared after 15 minutes without use, when the browser closes, or when you lock the vault.",
      "The extension runs on every site you open, to find login fields and offer your saved logins inside them. That happens in your browser; nothing about the pages you visit is sent anywhere.",
      "It changes a page only when you pick a login or click Fill, and then only to fill the login form.",
    ],
  },
  {
    id: "how-we-use-data",
    title: "How we use your data",
    bullets: [
      "To run the service: your account, your sessions, and storing and sharing your encrypted vault.",
      "To send sign-in email: address verification, magic links and password resets.",
      "To keep the service secure and working: rate limiting, request logs and error reports.",
      "To see which pages of the website are read, in aggregate.",
      "To comply with the law where we must.",
    ],
  },
  {
    id: "legal-bases",
    title: "Legal bases for processing",
    paragraphs: [
      "For users in the EU, UK and Switzerland: we process your account, sessions and vault data to perform our contract with you (Art. 6(1)(b) GDPR), and logs, error reports and website analytics under our legitimate interest in running a secure, working service (Art. 6(1)(f)).",
    ],
  },
  {
    id: "sharing-and-processors",
    title: "Who else handles your data",
    paragraphs: [
      "We do not sell your data and we do not share it for advertising. These providers process some of it so the service can run:",
    ],
    bullets: [
      "Our hosting provider, which runs the server and the database that hold your account and your encrypted vault, in Singapore.",
      "Resend, which delivers sign-in email and therefore receives your email address and the message.",
      "Google, if you choose to sign in with Google, and for fonts as described above.",
      "Cloudflare, which hosts the website.",
      "Sentry, which receives error reports.",
    ],
    footnote:
      "We may disclose information if the law requires it. The most we can hand over is the account data listed above and encrypted vault data. We cannot produce readable passwords.",
  },
  {
    id: "cookies-and-storage",
    title: "Cookies and local storage",
    paragraphs: [
      "We use only what is needed to keep you signed in and remember your settings. There are no advertising cookies and no cross-site trackers.",
    ],
    bullets: [
      "Hosted service: a session cookie, cookies holding your access and refresh tokens, and one that remembers whether the sidebar is open.",
      "Website: your light or dark theme choice, kept in local storage.",
    ],
  },
  {
    id: "data-retention-and-deletion",
    title: "Data retention and deletion",
    bullets: [
      "Sessions end after 7 days without use, and at most 5 are kept per account. Refresh tokens last 24 hours.",
      "Magic links expire after 15 minutes, password reset links after an hour.",
      "Items you delete stay in your trash until you delete them permanently there.",
      "Your account and vault are kept until you ask us to delete them.",
    ],
    footnote:
      "There is no delete-account button in the app yet. Email hello@montarapass.com from your account's address and we will delete the account. That removes your key set, your folders and every item you own, including for the people you shared them with. Because we hold no keys, a deleted vault cannot be restored.",
  },
  {
    id: "your-rights",
    title: "Your rights",
    paragraphs: [
      "You can ask us for a copy of the personal data we hold about you, to correct it, or to delete it. Depending on where you live, you may also have the right to object to or restrict our processing and to complain to your data protection authority.",
      "To exercise a right, contact hello@montarapass.com. We respond within 30 days. A copy of your vault can only ever be ciphertext; you can read your own items in the app at any time.",
    ],
  },
  {
    id: "international-transfers",
    title: "International data transfers",
    paragraphs: [
      "Montara Project is based in Indonesia, and the server and database of the hosted service are in Singapore. The other providers listed above may process data in other countries, so your data can leave the country you live in. Vault content is encrypted before it leaves your device wherever it is stored.",
    ],
  },
  {
    id: "childrens-privacy",
    title: "Children’s privacy",
    paragraphs: [
      "Montara Pass is not intended for children under 16, and we do not knowingly collect their personal data.",
    ],
  },
  {
    id: "changes-and-contact",
    title: "Changes and contact",
    paragraphs: [
      "When this policy changes we update the date above. If a change is material, we tell account holders by email before it takes effect.",
      "Questions about privacy can be sent to hello@montarapass.com, or by mail to Montara Project, Semarang, Indonesia.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated={updated}
      intro="What Montara Pass stores about you, what it cannot read, and who else handles your data. Written from what the code does."
      sections={sections}
    />
  );
}
