"use client";
// Client component: highlights the current page and adds a mobile menu toggle.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { MenuItem } from "@/lib/content";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const strip = (u: string) => (u.startsWith(BASE) ? u.slice(BASE.length) : u) || "/";

export default function Nav({ items }: { items: MenuItem[] }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const isCurrent = (u: string) => pathname === strip(u);
  const inSection = (m: MenuItem) => isCurrent(m.url) || m.children.some((c) => isCurrent(c.url));
  return (
    <>
      <button className="menu-toggle" aria-expanded={open} aria-controls="main-menu" onClick={() => setOpen(!open)}>
        Menu
      </button>
      <nav aria-label="Main" id="main-menu" className={open ? "open" : undefined}>
        <ul className="menu">
          {items.map((m) => (
            <li key={m.url} className={m.children.length ? "has-sub" : undefined}>
              <Link href={strip(m.url)} aria-current={inSection(m) ? "page" : undefined} onClick={() => setOpen(false)}>
                {m.name}
              </Link>
              {m.children.length > 0 && (
                <ul className="sub">
                  {m.children.map((c) => (
                    <li key={c.url}>
                      <Link href={strip(c.url)} aria-current={isCurrent(c.url) ? "page" : undefined} onClick={() => setOpen(false)}>
                        {c.name}
                      </Link>
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
