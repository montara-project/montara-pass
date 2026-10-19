import type { Metadata } from "next";

/** The marketing site's canonical origin; the worker also answers on other hosts. */
export const META_URL = "https://montarapass.com";
export const META_TITLE = `Montara Pass - Secure, Open-Source Password Manager`;
export const META_DESCRIPTION = `Montara Pass is a secure, open-source password manager with zero-knowledge encryption. Logins are encrypted in your browser; the server only stores ciphertext.`;
export const META_IMAGE = "/static/montarapass-thumbnail.png";
export const META_KEYWORDS = `password manager, zero-knowledge encryption, open-source password manager, secure password manager`;

const SITE_NAME = "Montara Pass";

/** Site-wide defaults, set once on the root layout. */
export const META: Metadata = {
  metadataBase: new URL(META_URL),
  title: { default: META_TITLE, template: `%s - ${SITE_NAME}` },
  description: META_DESCRIPTION,
  keywords: META_KEYWORDS,
  applicationName: SITE_NAME,
  // og:/twitter: title and description are filled from each page's own.
  openGraph: {
    siteName: SITE_NAME,
    images: [{ url: META_IMAGE, width: 1024, height: 1024, alt: SITE_NAME }],
    locale: "en_US",
    type: "website",
  },
  twitter: { card: "summary", images: [META_IMAGE] },
  icons: { icon: "/static/logo-32.png", apple: "/static/logo-128.png" },
};

/** One page's metadata. Leave out `title` to use the site default. */
export function pageMeta({
  title,
  description = META_DESCRIPTION,
  path,
}: {
  title?: string;
  description?: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...META.openGraph, url: path },
  };
}
