"use client";
// Main menu: current-page highlight, drop-downs (hover/focus on desktop), slide-in panel on mobile.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { MenuItem } from "@/lib/content";
import { Caret, MenuIcon } from "./icons";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const strip = (u: string) => (u.startsWith(BASE) ? u.slice(BASE.length) : u) || "/";

export default function Nav({ items }: { items: MenuItem[] }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const here = (u: string) => pathname === strip(u);
  const inSection = (m: MenuItem) => (strip(m.url) === "/" ? pathname === "/" : pathname.startsWith(strip(m.url)));
  return (
    <>
      <button className="menu-toggle" aria-expanded={open} aria-controls="site-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
        <MenuIcon open={open} />
      </button>
      <nav aria-label="Main" id="site-nav" className={`site-nav${open ? " open" : ""}`}>
        <ul className="menu">
          {items.map((m) => (
            <li key={m.url} className={m.children.length ? "has-sub" : undefined}>
              <Link href={strip(m.url)} aria-current={inSection(m) ? "page" : undefined}>
                {m.name}
                {m.children.length > 0 && <Caret />}
              </Link>
              {m.children.length > 0 && (
                <ul className="sub">
                  {m.children.map((c) => (
                    <li key={c.url}>
                      <Link href={strip(c.url)} aria-current={here(c.url) ? "page" : undefined}>{c.name}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
