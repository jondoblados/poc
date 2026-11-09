import type { Metadata, Viewport } from "next";
import { Nunito_Sans, Open_Sans } from "next/font/google";
import Link from "next/link";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import TeamCarousel from "./components/TeamCarousel";
import { BASE, getMenu, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/content";
import "./globals.css";

// Same typefaces as mbsaas.org; downloaded at build time and served from this site (no Google request from visitors)
const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-open-sans", display: "swap" });
const nunito = Nunito_Sans({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_TITLE}` },
  description: SITE_DESCRIPTION,
  openGraph: { siteName: SITE_TITLE, type: "website" },
  icons: { icon: `${BASE}/brand/logo.png` },
  alternates: { types: { "application/rss+xml": `${SITE_URL}index.xml` } },
};
export const viewport: Viewport = { themeColor: "#660099" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const menu = getMenu();
  return (
    <html lang="en" className={`${openSans.variable} ${nunito.variable}`}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="site-header">
          <div className="container">
            <Link className="brand" href="/" aria-label="AMBSAAS home">
              <img src={`${BASE}/brand/logo.png`} width={136} height={100} alt="Manchester Business School Alumni Association of Singapore" />
              <span className="poc-badge">POC2</span>
            </Link>
            <Nav items={menu} />
          </div>
        </header>
        <main id="main">{children}<TeamCarousel /></main>
        <Footer items={menu} />
      </body>
    </html>
  );
}
