"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  CloseIcon,
  LogoMark,
  MenuIcon,
  MoonIcon,
  SunIcon,
} from "./icons";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#security", label: "Security" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  return (
    <button
      type="button"
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      aria-pressed={light}
      onClick={() => {
        const next = !document.documentElement.classList.contains("light");
        document.documentElement.classList.toggle("light", next);
        try {
          localStorage.setItem("theme", next ? "light" : "dark");
        } catch {
          /* storage can throw in private modes */
        }
        setLight(next);
      }}
      className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-mist transition-colors duration-200 hover:bg-card hover:text-fg"
    >
      {light ? <MoonIcon className="size-5" /> : <SunIcon className="size-5" />}
    </button>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex cursor-pointer items-center gap-2.5" aria-label="Montara Pass — home">
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
            href="/#pricing"
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-mist transition-colors duration-200 hover:text-fg"
          >
            Log in
          </a>
          <a
            href="#pricing"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#04150e] transition-colors duration-200 hover:bg-accent-bright"
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
        <nav
          aria-label="Mobile"
          className="border-t border-line bg-ink px-4 pb-6 pt-3 md:hidden"
        >
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
              href="#pricing"
              onClick={() => setOpen(false)}
              className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#04150e]"
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
