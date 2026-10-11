import { KeyRoundIcon, LockIcon, ShareIcon } from "@/components/icons";

import { Dim, Statement, IconTile } from "./shared";

const art = "mt-6 rounded-[10px] border border-line bg-abyss p-4 font-mono text-xs leading-5";

function UnlockArt() {
  const lines = [
    ["argon2id", "64 MiB · 3 passes"],
    ["master key", "→ vault key"],
    ["vault key", "→ private key"],
    ["private key", "→ item keys"],
  ];
  return (
    <div className={art} aria-hidden="true">
      <p className="text-mist">
        <span className="text-accent-bright">$</span> unlock
      </p>
      {lines.map(([left, right]) => (
        <p key={left} className="flex justify-between gap-3">
          <span className="text-fg">{left}</span>
          <span className="text-mist">{right}</span>
        </p>
      ))}
    </div>
  );
}

function RowsArt() {
  const rows = [
    ["login", "9fK2c1…Qx0="],
    ["login", "Zt81vB…mA4="],
    ["secure_note", "b0LwE7…7gk="],
  ];
  return (
    <div className={art} aria-hidden="true">
      <p className="flex justify-between gap-3 border-b border-line pb-1.5 text-mist">
        <span>type</span>
        <span>content</span>
      </p>
      {rows.map(([type, content]) => (
        <p key={content} className="flex justify-between gap-3 pt-1.5">
          <span className="text-fg">{type}</span>
          <span className="text-mist">{content}</span>
        </p>
      ))}
    </div>
  );
}

function MembersArt() {
  const members = [
    ["w-24", "owner"],
    ["w-20", "editor"],
    ["w-28", "viewer"],
  ];
  return (
    <div className={`${art} flex flex-col gap-2.5`} aria-hidden="true">
      {members.map(([width, role]) => (
        <p key={role} className="flex items-center gap-2.5">
          <span className="size-5 rounded-full border border-line bg-card" />
          <span className={`h-1.5 rounded-full bg-line ${width}`} />
          <span className="ml-auto rounded border border-line px-1.5 text-mist">{role}</span>
        </p>
      ))}
    </div>
  );
}

const layers = [
  {
    icon: KeyRoundIcon,
    title: "Master key",
    meta: "argon2id · 16-byte salt · 32-byte key",
    body: "Your master password becomes a key on your device. It is derived on unlock, takes about a second, and is stored nowhere.",
    art: <UnlockArt />,
  },
  {
    icon: LockIcon,
    title: "Item keys",
    meta: "aes-256-gcm · one key per item",
    body: "Every item is sealed with its own random key. Name, username, password, URL and notes are all inside the ciphertext.",
    art: <RowsArt />,
  },
  {
    icon: ShareIcon,
    title: "Wrapped per member",
    meta: "rsa-oaep · 3072-bit · sha-256",
    body: "Sharing wraps the item key with the recipient's public key. The content is not re-encrypted and the server never holds the key.",
    art: <MembersArt />,
  },
];

export function Explainer() {
  return (
    <section id="security" className="border-t border-line">
      <Statement
        title={
          <>
            Encrypted in the browser. <Dim>Stored as ciphertext.</Dim>
          </>
        }
      >
        Three layers of keys. The server keeps the wrapped ones and can open none of them.
      </Statement>
      <div className="grid gap-px border-t border-line bg-line md:grid-cols-3">
        {layers.map((layer) => (
          <article key={layer.title} className="bg-ink p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <IconTile icon={layer.icon} />
              <h3 className="font-medium">{layer.title}</h3>
            </div>
            <p className="mt-4 font-mono text-xs lowercase text-mist">{layer.meta}</p>
            <p className="mt-3 text-[15px] leading-7 text-mist">{layer.body}</p>
            {layer.art}
          </article>
        ))}
      </div>
    </section>
  );
}
