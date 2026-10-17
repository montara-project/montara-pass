import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import ReactQueryProvider from "@/lib/providers/react-query";

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
      <head>
        <script
          defer
          src="https://analytics.masb0ymas.com/script.js"
          data-website-id="b3351383-ca94-4973-85fd-dca3cac12369"
        ></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var s=localStorage.getItem("theme");var l=s?s==="light":window.matchMedia("(prefers-color-scheme: light)").matches;document.documentElement.classList.toggle("light",l)}catch(e){}})();',
          }}
        />
        {/* Page frame: one bordered column, hatched gutters on either side. */}
        <div className="mx-auto min-h-screen w-full max-w-[1200px] border-x border-line bg-ink">
          <ReactQueryProvider>
            <SiteHeader />
            {children}
            <SiteFooter />
          </ReactQueryProvider>
        </div>
      </body>
    </html>
  );
}
