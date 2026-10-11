import { PlusIcon } from "@/components/icons";
import { Dim, Statement } from "@/components/shared";

const faqs = [
  {
    q: "What can the server see?",
    a: "Ciphertext, wrapped keys, and one field in the clear: the item type, login or secure_note, so clients can filter. It also knows your account email and which users an item is shared with. It never receives the master password, any unwrapped key, item content or folder names.",
  },
  {
    q: "What happens if I forget my master password?",
    a: "The vault cannot be read by anyone. The server holds nothing that can open the vault key, so there is no reset and no recovery.",
  },
  {
    q: "Is the master password my sign-in password?",
    a: "No. You sign in with a password, a magic link or Google. The master password is separate, unlocks the vault on your device and never reaches the server.",
  },
  {
    q: "What do I need to self-host?",
    a: "A server with Docker, PostgreSQL 18 (the schema uses uuidv7()), a domain with HTTPS and a Resend API key for sign-in emails. The repository ships a Compose stack for Dokploy.",
  },
  {
    q: "Which browsers does the extension support?",
    a: "Chrome, other Chromium browsers and Firefox 140 or newer. You build it with pnpm build:extension and load it from disk, then point it at your server's origin.",
  },
  {
    q: "Is there a mobile app?",
    a: "No. There is the web app and the browser extension.",
  },
  {
    q: "Can a removed member still read a shared item?",
    a: "Not future versions. Removing a member rotates the item key. Anything they already read, they have read, so change the password itself if that matters.",
  },
  {
    q: "Why is search done in the browser?",
    a: "The server cannot search or sort encrypted content. The web app decrypts the page it received and filters there. Folder, type and trash are filtered on the server.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-t border-line pb-20 sm:pb-28">
      <Statement
        title={
          <>
            Questions people ask <Dim>before trusting a vault.</Dim>
          </>
        }
      />
      <div className="mx-auto -mt-8 max-w-2xl border-t border-line px-6 sm:px-0">
        {faqs.map((item) => (
          <details key={item.q} className="group border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-1 py-5 text-[15px] font-medium sm:px-4">
              {item.q}
              <PlusIcon className="size-4 shrink-0 text-mist transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" />
            </summary>
            <p className="px-1 pb-6 text-[15px] leading-7 text-mist sm:px-4">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
