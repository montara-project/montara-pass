import type { Metadata } from "next";

import { REPO_URL } from "@/components/links";
import { chip } from "@/components/shared";
import { TocNav } from "@/components/toc-nav";
import { releases } from "@/lib/changelog";
import { pageMeta } from "@/lib/constants/meta";

export const metadata: Metadata = pageMeta({
  title: "Changelog",
  description:
    "Every Montara Pass release: new features, fixes and breaking changes across the web app, the browser extension, the mobile app and the server.",
  path: "/changelog",
});

function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Text with `inline code` spans, as the changelog writes them. */
function InlineCode({ text }: { text: string }) {
  return text.split("`").map((part, index) =>
    index % 2 ? (
      <code key={index} className="font-mono text-[0.9em] text-fg">
        {part}
      </code>
    ) : (
      part
    )
  );
}

export default function ChangelogPage() {
  return (
    <div>
      <div className="border-b border-line">
        <div className="px-6 py-16 sm:px-10 sm:py-20">
          <p className="font-mono text-xs lowercase text-mist">Product</p>
          <h1 className="mt-4 font-heading text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            Changelog
          </h1>
          {releases[0] ? (
            <p className="mt-4 font-mono text-xs lowercase text-mist">
              latest v{releases[0].version} · {formatDate(releases[0].date)}
            </p>
          ) : null}
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-mist">
            What changed in each release of Montara Pass, newest first. Every entry links to its
            commit on{" "}
            <a href={REPO_URL} className="text-fg underline underline-offset-4 hover:no-underline">
              GitHub
            </a>
            .
          </p>
        </div>
      </div>

      <div className="grid gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 lg:py-16">
        <TocNav items={releases.map((r) => ({ id: `v${r.version}`, title: `v${r.version}` }))} />

        <div className="min-w-0 max-w-3xl">
          {releases.map((release) => (
            <section
              key={release.version}
              id={`v${release.version}`}
              className="scroll-mt-24 border-b border-line py-8 first:pt-0 last:border-b-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-heading text-xl font-medium tracking-tight sm:text-2xl">
                  v{release.version}
                </h2>
                <p className="font-mono text-xs lowercase text-mist">
                  {release.compareUrl ? (
                    <a href={release.compareUrl} className="hover:text-fg">
                      <time dateTime={release.date}>{formatDate(release.date)}</time>
                    </a>
                  ) : (
                    <time dateTime={release.date}>{formatDate(release.date)}</time>
                  )}
                </p>
              </div>

              {release.groups.map((group) => (
                <div key={group.title} className="mt-8">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-fg">
                      {group.title.charAt(0) + group.title.slice(1).toLowerCase()}
                    </h3>
                    <span aria-hidden="true" className="h-px flex-1 bg-line" />
                    <span className="font-mono text-xs tabular-nums text-mist">
                      {group.entries.length}
                    </span>
                  </div>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {group.entries.map((entry, index) => (
                      <li
                        key={index}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-3 text-[15px] leading-7 text-mist"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-3 size-1 self-start rounded-full bg-mist"
                        />
                        <span>
                          {entry.scope ? (
                            <span className={`${chip} mr-2`}>{entry.scope}</span>
                          ) : null}
                          <InlineCode text={entry.text} />
                        </span>
                        {entry.commit ? (
                          <a
                            href={entry.commit.url}
                            aria-label={`Commit ${entry.commit.hash.slice(0, 7)} on GitHub`}
                            className="font-mono text-xs tabular-nums text-mist underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-fg hover:decoration-fg motion-reduce:transition-none"
                          >
                            {entry.commit.hash.slice(0, 7)}
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
