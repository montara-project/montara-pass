import { TocNav } from "./toc-nav";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  links?: { label: string; href: string }[];
  footnote?: string;
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export function LegalPage({ eyebrow, title, updated, intro, sections }: LegalPageProps) {
  return (
    <div>
      <div className="border-b border-line">
        <div className="px-6 py-16 sm:px-10 sm:py-20">
          <p className="font-mono text-xs lowercase text-mist">{eyebrow}</p>
          <h1 className="mt-4 font-heading text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 font-mono text-xs lowercase text-mist">last updated {updated}</p>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-mist">{intro}</p>
        </div>
      </div>

      <div className="grid gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 lg:py-16">
        <TocNav items={sections.map((s) => ({ id: s.id, title: s.title }))} />

        <div className="min-w-0 max-w-3xl">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 border-b border-line py-8 first:pt-0 last:border-b-0"
            >
              <h2 className="font-heading text-xl font-medium tracking-tight sm:text-2xl">
                <span className="mr-3 font-mono text-sm font-normal text-mist" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {section.title}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph.slice(0, 32)} className="mt-4 leading-7 text-mist">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-4 flex flex-col gap-2.5">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet.slice(0, 32)}
                      className="flex gap-3 text-[15px] leading-7 text-mist"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-3 size-1 shrink-0 rounded-full bg-mist"
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.footnote ? (
                <p className="mt-4 border-l-2 border-line pl-4 text-[15px] leading-7 text-mist">
                  {section.footnote}
                </p>
              ) : null}
              {section.links ? (
                <ul className="mt-4 flex flex-col gap-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="cursor-pointer text-sm font-medium text-fg underline underline-offset-4 hover:no-underline"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
