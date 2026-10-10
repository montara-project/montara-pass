"use client";

import { useRef, useState, type FormEvent } from "react";
import { AlertTriangleIcon, EyeIcon, EyeOffIcon, SyncIcon } from "./icons";

type FieldName = "email" | "password";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;
type Touched = Partial<Record<FieldName, boolean>>;

const EMPTY: Values = { email: "", password: "" };

function validate(field: FieldName, value: string): string | undefined {
  const v = value.trim();
  if (field === "email") {
    if (!v) return "Enter your email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      return "Enter a valid email address, like name@example.com.";
    }
    return undefined;
  }
  if (!v) return "Enter your master password.";
  if (v.length < 8) return "Master passwords are at least 8 characters.";
  return undefined;
}

const inputClass = (invalid: boolean) =>
  `h-12 w-full rounded-xl border bg-abyss/60 px-4 text-sm text-fg placeholder:text-mist/50 transition-colors duration-200 focus:outline-none focus:ring-2 ${
    invalid
      ? "border-rose-400/60 focus:border-rose-300 focus:ring-rose-400/30"
      : "border-line hover:border-mist/30 focus:border-accent-bright focus:ring-accent/30"
  }`;

export function LoginForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Touched>({});
  const [status, setStatus] = useState<"idle" | "signing">("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const setField = (field: FieldName, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validate(field, value) }));
    }
  };

  const blurField = (field: FieldName) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validate(field, values[field]) }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Errors = {};
    for (const field of ["email", "password"] as FieldName[]) {
      const error = validate(field, values[field]);
      if (error) nextErrors[field] = error;
    }
    setErrors(nextErrors);
    setTouched({ email: true, password: true });

    if (Object.values(nextErrors).some(Boolean)) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setStatus("signing");
    window.setTimeout(() => {
      window.location.assign("/");
    }, 900);
  };

  const activeErrors = (["email", "password"] as FieldName[])
    .map((field) => [field, errors[field]] as const)
    .filter(([, message]) => Boolean(message));
  const signing = status === "signing";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {activeErrors.length > 0 ? (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          className="rounded-xl border border-rose-400/40 bg-rose-400/10 p-4 focus:outline-none"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-rose-200 light:text-rose-800">
            <AlertTriangleIcon className="size-4" />
            There {activeErrors.length === 1 ? "is 1 problem" : `are ${activeErrors.length} problems`} with this form
          </p>
          <ul className="mt-2 flex flex-col gap-1 pl-6">
            {activeErrors.map(([field, message]) => (
              <li key={field} className="list-disc">
                <a
                  href={`#login-${field}`}
                  className="text-sm text-rose-200 light:text-rose-700 underline underline-offset-2 hover:text-rose-100 light:hover:text-rose-900"
                >
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-fg">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={values.email}
          onChange={(e) => setField("email", e.target.value)}
          onBlur={() => blurField("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className={`mt-2 ${inputClass(Boolean(errors.email))}`}
        />
        {errors.email ? (
          <p id="login-email-error" role="alert" className="mt-1.5 text-xs text-rose-300 light:text-rose-700">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-fg">
          Master password
        </label>
        <div className="relative mt-2">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Your master password"
            value={values.password}
            onChange={(e) => setField("password", e.target.value)}
            onBlur={() => blurField("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "login-password-error" : "login-password-hint"
            }
            className={`${inputClass(Boolean(errors.password))} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            aria-controls="login-password"
            className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-mist transition-colors duration-200 hover:text-fg"
          >
            {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
          </button>
        </div>
        {errors.password ? (
          <p id="login-password-error" role="alert" className="mt-1.5 text-xs text-rose-300 light:text-rose-700">
            {errors.password}
          </p>
        ) : (
          <p id="login-password-hint" className="mt-1.5 text-xs leading-5 text-mist">
            Your master password unlocks your vault on this device only — we never receive it and
            can&rsquo;t reset it for you.
          </p>
        )}
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="size-5 accent-accent"
        />
        <span className="text-sm text-mist">Remember this device for 30 days</span>
      </label>

      <button
        type="submit"
        disabled={signing}
        className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-on-accent transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {signing ? (
          <>
            <SyncIcon className="size-4 motion-safe:animate-spin" />
            Unlocking your vault…
          </>
        ) : (
          "Log in"
        )}
      </button>
    </form>
  );
}
