import { LogoMark } from "./icons";

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Security", href: "/#security" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Downloads", href: "/" },
      { label: "Browser extension", href: "/" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/" },
      { label: "Blog", href: "/" },
      { label: "Careers", href: "/" },
      { label: "Contact us", href: "/contact" },
      { label: "Press kit", href: "/" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help center", href: "/" },
      { label: "Security whitepaper", href: "/#security" },
      { label: "Guides", href: "/" },
      { label: "System status", href: "/" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      { label: "Cookie settings", href: "/" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-abyss">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <a
              href="/"
              className="flex w-fit cursor-pointer items-center gap-2.5"
              aria-label="Montara Pass — back to home"
            >
              <LogoMark className="size-8" />
              <span className="font-heading text-lg font-semibold tracking-tight">
                Montara<span className="text-accent-bright">Pass</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-6 text-mist">
              The zero-knowledge password manager. Your logins, encrypted on your device — never on
              our servers.
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-heading text-sm font-semibold text-fg">{col.title}</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="cursor-pointer text-sm text-mist transition-colors duration-200 hover:text-fg"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-mist">© 2026 Montara Labs, Inc. All rights reserved.</p>
          <p className="text-xs text-mist">Independently audited · SOC 2 Type II · GDPR-ready</p>
        </div>
      </div>
    </footer>
  );
}
