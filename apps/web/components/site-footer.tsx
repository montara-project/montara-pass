import { GithubIcon, LogoMark } from "./icons";
import { docsUrl, REPO_URL } from "./links";

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Security", href: "/#security" },
      { label: "Features", href: "/#features" },
      { label: "Self-host", href: "/#self-host" },
      { label: "Pricing", href: "/pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Docs",
    links: [
      { label: "Installation", href: docsUrl("getting-started/installation") },
      { label: "Docker and Dokploy", href: docsUrl("getting-started/docker") },
      { label: "Encryption", href: docsUrl("architecture/encryption") },
      { label: "Browser extension", href: docsUrl("clients/browser-extension") },
      { label: "API reference", href: docsUrl("api-reference") },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="grid gap-10 px-6 py-14 sm:px-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <a
            href="/"
            className="flex w-fit cursor-pointer items-center gap-2.5"
            aria-label="Montara Pass — back to home"
          >
            <LogoMark className="size-7" />
            <span className="font-heading text-base font-semibold tracking-tight">
              Montara<span className="text-accent-bright">Pass</span>
            </span>
          </a>
          <p className="mt-3 max-w-xs text-sm leading-6 text-mist">
            The password manager your server can&rsquo;t read.
          </p>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="text-sm font-medium text-fg">{col.title}</h3>
            <ul className="mt-4 flex flex-col gap-3">
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

      <div className="flex items-center justify-between gap-4 border-t border-line px-6 py-5 sm:px-10">
        <p className="font-mono text-xs text-mist">© 2026 Montara Project</p>
        <a
          href={REPO_URL}
          aria-label="Montara Pass on GitHub"
          className="-m-2 cursor-pointer p-2 text-mist transition-colors duration-200 hover:text-fg"
        >
          <GithubIcon className="size-4.5" />
        </a>
      </div>
    </footer>
  );
}
