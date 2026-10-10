"use client";

import { useEffect, useState } from "react";

import {
  ArrowRightIcon,
  CloseIcon,
  LogoMark,
  MenuIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "./icons";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#security", label: "Security" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const light =
    theme === "light" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.classList.toggle("light", light);
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
      onClick={() => {
        const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
        setTheme(next);
        try {
          if (next === "system") {
            localStorage.removeItem("theme");
          } else {
            localStorage.setItem("theme", next);
          }
        } catch {
          /* storage can throw in private modes */
        }
        applyTheme(next);
      }}
      className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-mist transition-colors duration-200 hover:bg-card hover:text-fg"
    >
      {theme === "light" ? (
        <SunIcon className="size-5" />
      ) : theme === "dark" ? (
        <MoonIcon className="size-5" />
      ) : (
        <MonitorIcon className="size-5" />
      )}
    </button>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          href="/"
          className="flex cursor-pointer items-center gap-2.5"
          aria-label="Montara Pass — home"
        >
          <LogoMark className="size-8" />
          <span className="font-heading text-lg font-semibold tracking-tight">
            Montara<span className="text-accent-bright">Pass</span>
          </span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="cursor-pointer text-sm font-medium text-mist transition-colors duration-200 hover:text-fg"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <a
            href="/login"
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-mist transition-colors duration-200 hover:text-fg"
          >
            Log in
          </a>
          <a
            href="/#pricing"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors duration-200 hover:bg-accent-hover"
          >
            Get Montara Pass
            <ArrowRightIcon className="size-4" />
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
            <a
              href="/#pricing"
              onClick={() => setOpen(false)}
              className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent"
            >
              Get Montara Pass
              <ArrowRightIcon className="size-4" />
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
