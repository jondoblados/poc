import Link from "next/link";
import { BASE, type MenuItem } from "@/lib/content";
import Wave from "./Wave";
import { Facebook, LinkedIn } from "./icons";

const strip = (u: string) => u.slice(BASE.length) || "/";

export default function Footer({ items }: { items: MenuItem[] }) {
  return (
    <footer className="site-footer">
      <Wave />
      <div className="container">
        <div className="footer-grid">
          <div className="footer-logo">
            <img src={`${BASE}/brand/logo-footer.png`} width={297} height={219} alt="Manchester Business School Alumni Association of Singapore" loading="lazy" />
          </div>
          <ul className="footer-menu">
            {items.map((m) => (
              <li key={m.url}><Link href={strip(m.url)}>{m.name}</Link></li>
            ))}
          </ul>
          <div className="footer-contact">
            <p><a className="email" href="mailto:honsec.mbsaas@gmail.com">honsec.mbsaas@gmail.com</a></p>
            <p className="gold">Questions? Drop us a line!</p>
            <div className="social">
              <a href="https://www.linkedin.com/company/mbsaas/" rel="noopener" target="_blank" aria-label="AMBSAAS on LinkedIn"><LinkedIn /></a>
              <a href="https://www.facebook.com/MBSAPACAlumni" rel="noopener" target="_blank" aria-label="AMBSAAS on Facebook"><Facebook /></a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="copy">All rights reserved © AMBSAAS {new Date().getFullYear()}</span>
          <span className="poc">
            POC2: written in Google Docs, built with Next.js. <a href={`${BASE}/index.xml`}>RSS</a> ·{" "}
            <a href="https://jon.doblados.net/poc/">Hugo POC</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
