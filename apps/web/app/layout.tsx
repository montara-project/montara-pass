import type { Metadata } from "next";

import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Montara Pass — Zero-knowledge password manager",
  description:
    "Montara Pass is an end-to-end encrypted password manager you can run yourself. Logins are encrypted in the browser; the server stores ciphertext and wrapped keys.",
  icons: { icon: "/static/logo-32.png", apple: "/static/logo-128.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var s=localStorage.getItem("theme");var l=s?s==="light":window.matchMedia("(prefers-color-scheme: light)").matches;document.documentElement.classList.toggle("light",l)}catch(e){}})();',
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
        />
        {/* Page frame: one bordered column, hatched gutters on either side. */}
        <div className="mx-auto min-h-screen w-full max-w-[1200px] border-x border-line bg-ink">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
