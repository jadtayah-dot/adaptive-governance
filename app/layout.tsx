import type { Metadata } from "next";
import "./globals.css";
import home from "@/content/home.json";
import { fontVariables } from "./fonts";

// Both values come from content/home.json, which is the copy file. Nothing here
// is written by hand.
export const metadata: Metadata = {
  title: home.hero.title,
  description: home.hero.subtitle,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const nav = home.nav;
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* First in tab order. Visually hidden until it takes focus. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-rule focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-ink"
        >
          {nav.skipLink}
        </a>

        <header className="border-b border-rule bg-surface">
          <nav
            aria-label={nav.primaryLabel}
            className="mx-auto flex w-full max-w-5xl flex-wrap gap-x-6 gap-y-2 px-6 py-4 md:px-10"
          >
            {nav.primary.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="inline-flex min-h-11 items-center text-[0.9rem] text-ink-muted underline underline-offset-4 hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <main id="main" className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
