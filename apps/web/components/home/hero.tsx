import { ArrowRightIcon, LogoMark } from "@/components/icons";
import { docsUrl, REPO_URL } from "@/components/links";
import pkg from "@/package.json";

import { Dim } from "./shared";

export function Hero() {
  return (
    <section id="top" className="mx-auto max-w-3xl px-6 pb-24 pt-20 text-center sm:pb-28 sm:pt-28">
      <a
        href={`${REPO_URL}/blob/main/CHANGELOG.md`}
        className="inline-flex cursor-pointer items-center rounded-full border border-line bg-card text-xs transition-colors duration-200 hover:border-mist/50"
      >
        <span className="flex items-center gap-2 py-1.5 pl-3 pr-2.5 font-medium">
          <span className="size-1.5 rounded-full bg-accent-bright" />
          Latest release
        </span>
        <span className="border-l border-line py-1.5 pl-2.5 pr-3 font-mono text-mist">
          v{pkg.version}
        </span>
      </a>

      <h1 className="mt-8 text-balance font-heading text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
        A password manager <Dim>your server can&rsquo;t read.</Dim>
      </h1>
      <p className="mx-auto mt-7 max-w-xl text-pretty text-lg leading-8 text-mist">
        Montara Pass encrypts every login in the browser. The server you run stores ciphertext and
        wrapped keys. Nothing else.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <a href="#self-host" className="btn btn-primary">
          Self-host
          <ArrowRightIcon className="size-4" />
        </a>
        <a href={docsUrl()} className="btn btn-secondary">
          Read the docs
        </a>
      </div>

      <div className="mt-10 flex items-center justify-center gap-3 text-left">
        <LogoMark className="size-8 rounded-full" />
        <p className="text-sm leading-5">
          Built by Montara Project.
          <span className="block font-mono text-xs lowercase text-mist">
            argon2id · aes-256-gcm · rsa-oaep 3072
          </span>
        </p>
      </div>
    </section>
  );
}
