import type { Metadata } from "next";
import Link from "next/link";
import Nav from "./components/Nav";
import { getMenu, SITE_DESCRIPTION, SITE_TITLE, SITE_URL, BASE } from "@/lib/content";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_TITLE}` },
  description: SITE_DESCRIPTION,
  openGraph: { siteName: SITE_TITLE, type: "website" },
  alternates: { types: { "application/rss+xml": `${SITE_URL}index.xml` } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link className="brand" href="/">
              AMBSAAS <span>POC2</span>
              <span className="badge">Next.js</span>
            </Link>
            <Nav items={getMenu()} />
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="wrap site-footer">
          <p>
            Content is written in Google Docs and published automatically with GitHub Actions + Next.js (static export).{" "}
            <a href={`${BASE}/index.xml`}>RSS</a> · Compare with the <a href="https://jon.doblados.net/poc/">Hugo POC</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
