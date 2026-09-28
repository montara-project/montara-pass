import { LogoMark } from "./icons";

const columns: { title: string; links: string[] }[] = [
  { title: "Product", links: ["Features", "Security", "Pricing", "Downloads", "Browser extension"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Press kit"] },
  { title: "Resources", links: ["Help center", "Security whitepaper", "Guides", "System status"] },
  { title: "Legal", links: ["Privacy policy", "Terms of service", "Cookie settings"] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-abyss">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <a href="#top" className="flex w-fit cursor-pointer items-center gap-2.5" aria-label="Montara Pass — back to top">
              <LogoMark className="size-8" />
              <span className="font-heading text-lg font-semibold tracking-tight">
                Montara<span className="text-accent-bright">Pass</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-6 text-mist">
              The zero-knowledge password manager. Your logins, encrypted on your device — never on our servers.
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-heading text-sm font-semibold text-fg">{col.title}</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#top"
                      className="cursor-pointer text-sm text-mist transition-colors duration-200 hover:text-fg"
                    >
                      {link}
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
