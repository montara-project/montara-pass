"use client";

import { useEffect, useRef } from "react";
import { ChevronDownIcon } from "./icons";

export type TocItem = { id: string; title: string };

export function TocNav({ items }: { items: TocItem[] }) {
  const activeRef = useRef(items[0]?.id ?? "");
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const headerOffset = 140;
    let raf = 0;

    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        let current = items[0]?.id ?? "";
        for (const item of items) {
          const el = document.getElementById(item.id);
          if (el && el.getBoundingClientRect().top <= headerOffset) {
            current = item.id;
          }
        }
        const atBottom =
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 4;
        if (atBottom && items.length > 0) current = items[items.length - 1].id;
        activeRef.current = current;
        for (const link of document.querySelectorAll<HTMLAnchorElement>("a[data-toc-link]")) {
          const isActive = link.dataset.tocLink === current;
          link.classList.toggle("border-accent-bright", isActive);
          link.classList.toggle("font-medium", isActive);
          link.classList.toggle("text-accent-soft", isActive);
          link.classList.toggle("border-line", !isActive);
          link.classList.toggle("text-mist", !isActive);
        }
      });
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [items]);

  const linkClass =
    "block cursor-pointer border-l-2 py-1.5 pl-4 text-sm transition-colors duration-200";

  const list = (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            data-toc-link={item.id}
            onClick={() => detailsRef.current?.removeAttribute("open")}
            className={`${linkClass} ${item.id === items[0]?.id ? "border-accent-bright font-medium text-accent-soft" : "border-line text-mist hover:border-mist/50 hover:text-fg"}`}
          >
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* Mobile / tablet: collapsible above the content */}
      <details ref={detailsRef} className="group rounded-xl border border-line bg-card lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-sm font-semibold">
          On this page
          <ChevronDownIcon className="size-4 text-mist transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <div className="px-3 pb-3">{list}</div>
      </details>

      {/* Desktop: sticky sidebar with scroll-spy */}
      <nav
        aria-label="On this page"
        className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 lg:block"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-mist">
          On this page
        </p>
        {list}
      </nav>
    </>
  );
}
