"use client";

import { useRef, useState, type FormEvent } from "react";

import { AlertTriangleIcon, CheckIcon, ChevronDownIcon, SyncIcon } from "./icons";

type FieldName = "name" | "email" | "topic" | "message";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;
type Touched = Partial<Record<FieldName, boolean>>;

const EMPTY: Values = { name: "", email: "", topic: "", message: "" };
const TOPICS = ["General support", "Security disclosure", "Business and sales", "Press and media"];

function validate(field: FieldName, value: string): string | undefined {
  const v = value.trim();
  switch (field) {
    case "name":
      if (!v) return "Enter your name.";
      if (v.length < 2) return "Your name needs at least 2 characters.";
      return undefined;
    case "email":
      if (!v) return "Enter an email address.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        return "Enter a valid email address, like name@example.com.";
      }
      return undefined;
    case "topic":
      return v ? undefined : "Choose a topic.";
    case "message":
      if (!v) return "Enter a message.";
      if (v.length < 20) return "Give us a little more detail — at least 20 characters.";
      return undefined;
  }
}

const inputClass = (invalid: boolean) =>
  `h-12 w-full rounded-xl border bg-abyss/60 px-4 text-sm text-fg placeholder:text-mist/50 transition-colors duration-200 focus:outline-none focus:ring-2 ${
    invalid
      ? "border-rose-400/60 focus:border-rose-300 focus:ring-rose-400/30"
      : "border-line hover:border-mist/30 focus:border-accent-bright focus:ring-accent/30"
  }`;

export function ContactForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Touched>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [reference, setReference] = useState("");
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
    for (const field of ["name", "email", "topic", "message"] as FieldName[]) {
      const error = validate(field, values[field]);
      if (error) nextErrors[field] = error;
    }
    setErrors(nextErrors);
    setTouched({ name: true, email: true, topic: true, message: true });

    if (Object.values(nextErrors).some(Boolean)) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setStatus("sending");
    window.setTimeout(() => {
      setReference(`MTP-${Math.random().toString(16).slice(2, 8).toUpperCase()}`);
      setStatus("sent");
    }, 900);
  };

  const reset = () => {
    setValues(EMPTY);
    setErrors({});
    setTouched({});
    setReference("");
    setStatus("idle");
  };

  if (status === "sent") {
    return (
      <div
        role="status"
        className="rounded-[14px] border border-line bg-card p-8 text-center sm:p-10"
      >
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-fg">
          <CheckIcon className="size-6 text-ink" strokeWidth={2.5} />
        </span>
        <h3 className="mt-5 font-heading text-xl font-medium">Message sent</h3>
        <p className="mt-2 text-sm leading-6 text-mist">
          Reference <span className="font-mono text-accent-soft">{reference}</span>. We reply within
          one business day — usually much faster.
        </p>
        <p className="mx-auto mt-4 max-w-sm text-xs leading-5 text-mist/80">
          We will never ask for your master password, passkeys, or recovery key — and we can never
          see the contents of your vault.
        </p>
        <button type="button" onClick={reset} className="btn btn-secondary mt-6">
          Send another message
        </button>
      </div>
    );
  }

  const activeErrors = (["name", "email", "topic", "message"] as FieldName[])
    .map((field) => [field, errors[field]] as const)
    .filter(([, message]) => Boolean(message));
  const sending = status === "sending";

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
            There{" "}
            {activeErrors.length === 1
              ? "is 1 problem"
              : `are ${activeErrors.length} problems`}{" "}
            with this form
          </p>
          <ul className="mt-2 flex flex-col gap-1 pl-6">
            {activeErrors.map(([field, message]) => (
              <li key={field} className="list-disc">
                <a
                  href={`#contact-${field}`}
                  className="text-sm text-rose-200 light:text-rose-800 underline underline-offset-2 hover:text-rose-100 light:hover:text-rose-900"
                >
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-fg">
            Name
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Ada Lovelace"
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            onBlur={() => blurField("name")}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            className={`mt-2 ${inputClass(Boolean(errors.name))}`}
          />
          {errors.name ? (
            <p
              id="contact-name-error"
              role="alert"
              className="mt-1.5 text-xs text-rose-300 light:text-rose-700"
            >
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-fg">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            onBlur={() => blurField("email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            className={`mt-2 ${inputClass(Boolean(errors.email))}`}
          />
          {errors.email ? (
            <p
              id="contact-email-error"
              role="alert"
              className="mt-1.5 text-xs text-rose-300 light:text-rose-700"
            >
              {errors.email}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="contact-topic" className="block text-sm font-medium text-fg">
          Topic
        </label>
        <div className="relative mt-2">
          <select
            id="contact-topic"
            name="topic"
            value={values.topic}
            onChange={(e) => setField("topic", e.target.value)}
            onBlur={() => blurField("topic")}
            aria-invalid={Boolean(errors.topic)}
            aria-describedby={errors.topic ? "contact-topic-error" : undefined}
            className={`${inputClass(Boolean(errors.topic))} appearance-none pr-10 ${
              values.topic ? "" : "text-mist/60"
            }`}
          >
            <option value="" disabled className="bg-abyss text-fg">
              Choose a topic
            </option>
            {TOPICS.map((topic) => (
              <option key={topic} value={topic} className="bg-abyss text-fg">
                {topic}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-mist" />
        </div>
        {errors.topic ? (
          <p
            id="contact-topic-error"
            role="alert"
            className="mt-1.5 text-xs text-rose-300 light:text-rose-700"
          >
            {errors.topic}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-fg">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          placeholder="Tell us what you need help with."
          value={values.message}
          onChange={(e) => setField("message", e.target.value)}
          onBlur={() => blurField("message")}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "contact-message-error" : "contact-message-hint"}
          className={`mt-2 min-h-32 w-full resize-y rounded-xl border bg-abyss/60 px-4 py-3 text-sm leading-6 text-fg placeholder:text-mist/50 transition-colors duration-200 focus:outline-none focus:ring-2 ${
            errors.message
              ? "border-rose-400/60 focus:border-rose-300 focus:ring-rose-400/30"
              : "border-line hover:border-mist/30 focus:border-accent-bright focus:ring-accent/30"
          }`}
        />
        {errors.message ? (
          <p
            id="contact-message-error"
            role="alert"
            className="mt-1.5 text-xs text-rose-300 light:text-rose-700"
          >
            {errors.message}
          </p>
        ) : (
          <p id="contact-message-hint" className="mt-1.5 text-xs leading-5 text-mist">
            Please don&rsquo;t include passwords, passkeys, or recovery keys — we can&rsquo;t read
            your vault, and we&rsquo;ll never ask.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={sending}
        className="btn btn-primary h-11 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {sending ? (
          <>
            <SyncIcon className="size-4 motion-safe:animate-spin" />
            Sending…
          </>
        ) : (
          "Send message"
        )}
      </button>
    </form>
  );
}
