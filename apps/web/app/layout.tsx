import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Montara Pass — Zero-knowledge password manager",
  description:
    "Montara Pass stores, generates, and autofills your passwords with end-to-end encryption. One vault, every device, protected by a zero-knowledge architecture.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
        />
        {children}
      </body>
    </html>
  );
}
