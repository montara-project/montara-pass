import type { Metadata } from "next";
import { LoginForm } from "../_components/login-form";
import { LockIcon, ShieldCheckIcon, WifiOffIcon } from "../_components/icons";

export const metadata: Metadata = {
  title: "Log in — Montara Pass",
  description:
    "Sign in to your Montara Pass vault with your email and master password. Zero-knowledge: your master password never leaves your device, and we can never see it.",
};

const trustChips = [
  { icon: LockIcon, label: "Your master password never leaves this device" },
  { icon: ShieldCheckIcon, label: "Zero-knowledge — we can never see your vault" },
  { icon: WifiOffIcon, label: "Works offline, on every device you own" },
];

export default function LoginPage() {
  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_80%_at_50%_0%,rgba(30,58,95,0.5),transparent)] light:bg-[radial-gradient(60%_80%_at_50%_0%,rgba(30,58,95,0.08),transparent)]"
      />
      <div className="relative mx-auto flex w-full max-w-md flex-col px-4 pb-20 pt-14 sm:px-6 sm:pt-16">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs font-semibold text-accent-soft">
            <ShieldCheckIcon className="size-3.5" />
            Zero-knowledge sign-in
          </p>
          <h1 className="mt-6 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back.
          </h1>
          <p className="mt-3 leading-7 text-mist">
            Sign in with your email and master password to unlock your vault.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-card p-6 sm:p-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm leading-6 text-mist">
          Forgot your master password?{" "}
          <a
            href="/contact"
            className="cursor-pointer font-semibold text-accent-soft underline-offset-4 hover:underline"
          >
            Contact support
          </a>{" "}
          — we can&rsquo;t reset it for you.
        </p>
        <p className="mt-2 text-center text-sm leading-6 text-mist">
          New to Montara Pass?{" "}
          <a
            href="/#pricing"
            className="cursor-pointer font-semibold text-accent-soft underline-offset-4 hover:underline"
          >
            Get started — it&rsquo;s free
          </a>
        </p>

        <ul className="mt-10 flex flex-col gap-2.5">
          {trustChips.map((chip) => (
            <li key={chip.label} className="flex items-center gap-2 text-xs font-medium text-mist">
              <chip.icon className="size-4 shrink-0 text-accent-bright" />
              {chip.label}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
