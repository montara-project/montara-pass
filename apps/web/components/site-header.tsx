"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

import { CloseIcon, LogoMark, MenuIcon, MonitorIcon, MoonIcon, SunIcon } from "./icons";
import { docsUrl } from "./links";

const navLinks = [
  { href: "/#security", label: "Security" },
  { href: "/#features", label: "Features" },
  { href: "/#self-host", label: "Self-host" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: docsUrl(), label: "Docs" },
];

type Theme = "light" | "dark" | "system";

function isLight(theme: Theme) {
  return (
    theme === "light" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: light)").matches)
  );
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("light", isLight(theme));
}

/**
 * Runs `change` inside a view transition and reveals the new theme as a circle
 * growing from `origin`, after Magic UI's animated theme toggler. Falls back to
 * an instant switch without the API, under reduced motion, or when the page
 * would look the same (system resolving to the current theme).
 */
function revealTheme(origin: HTMLElement, next: Theme, change: () => void) {
  const root = document.documentElement;
  if (
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    isLight(next) === root.classList.contains("light")
  ) {
    change();
    return;
  }

  const { top, left, width, height } = origin.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  // Percentages of the snapshot box: px clip-paths land off-target on
  // fractional display scales in Chrome (magicuidesign/magicui#989).
  const w = window.innerWidth;
  const h = window.innerHeight;
  const at = `at ${(x / w) * 100}% ${(y / h) * 100}%`;
  const radius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
  // circle() percentages resolve against hypot(w, h) / √2.
  const to = `circle(${(radius / (Math.hypot(w, h) / Math.SQRT2)) * 100}% ${at})`;
  const from = `circle(0% ${at})`;

  root.style.setProperty("--theme-reveal-from", from);
  const transition = document.startViewTransition(() => flushSync(change));
  transition.ready
    .then(() =>
      root.animate(
        { clipPath: [from, to] },
        {
          duration: 450,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "forwards",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    )
    .catch(() => {});
  transition.finished.finally(() => root.style.removeProperty("--theme-reveal-from"));
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("theme");
    } catch {
      /* storage can throw in private modes */
    }
    setTheme(stored === "light" || stored === "dark" ? stored : "system");

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem("theme");
      } catch {
        /* storage can throw in private modes */
      }
      if ((stored ?? "system") === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <button
      type="button"
      aria-label={
        theme === "light"
          ? "Theme: light — switch to dark"
          : theme === "dark"
            ? "Theme: dark — follow system"
            : "Theme: system — switch to light"
      }
      onClick={(event) => {
        const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
        try {
          if (next === "system") {
            localStorage.removeItem("theme");
          } else {
            localStorage.setItem("theme", next);
          }
        } catch {
          /* storage can throw in private modes */
        }
        revealTheme(event.currentTarget, next, () => {
          setTheme(next);
          applyTheme(next);
        });
      }}
      className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-mist transition-colors duration-200 hover:bg-card hover:text-fg"
    >
      {theme === "light" ? (
        <SunIcon className="size-4" />
      ) : theme === "dark" ? (
        <MoonIcon className="size-4" />
      ) : (
        <MonitorIcon className="size-4" />
      )}
    </button>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6 sm:px-10">
        <a
          href="/"
          className="flex cursor-pointer items-center gap-2.5"
          aria-label="Montara Pass — home"
        >
          <LogoMark className="size-7" />
          <span className="font-heading text-base font-semibold tracking-tight">
            Montara<span className="text-accent-bright">Pass</span>
          </span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex lg:gap-7">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="cursor-pointer text-sm text-mist transition-colors duration-200 hover:text-fg"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <a
            href="https://app.montarapass.com"
            className="btn btn-primary rounded-full px-4 py-1.5"
          >
            Log in
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-line text-fg md:hidden"
        >
          {open ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>

      {open ? (
        <nav aria-label="Mobile" className="border-t border-line bg-ink px-4 pb-6 pt-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium text-mist transition-colors hover:bg-card hover:text-fg"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex items-center gap-2">
              <a
                href="https://app.montarapass.com"
                onClick={() => setOpen(false)}
                className="btn btn-primary flex-1 rounded-full"
              >
                Log in
              </a>
              <ThemeToggle />
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
