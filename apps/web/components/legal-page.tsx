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
      <div className="border-b border-line bg-abyss/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-bright">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-mist">Last updated {updated}</p>
          <p className="mt-5 max-w-2xl leading-7 text-mist">{intro}</p>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:py-16">
        <TocNav items={sections.map((s) => ({ id: s.id, title: s.title }))} />

        <div className="min-w-0 max-w-3xl">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 border-b border-line py-8 first:pt-0 last:border-b-0"
            >
              <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                <span className="mr-3 text-accent-bright" aria-hidden="true">
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
                      className="flex gap-3 text-sm leading-6 text-mist"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-bright"
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.footnote ? (
                <p className="mt-4 border-l-2 border-line pl-4 text-sm leading-6 text-mist">
                  {section.footnote}
                </p>
              ) : null}
              {section.links ? (
                <ul className="mt-4 flex flex-col gap-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="cursor-pointer text-sm font-medium text-accent-soft underline-offset-4 hover:underline"
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
