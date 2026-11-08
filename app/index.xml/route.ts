// RSS feed at /ambsaas/index.xml (same location as the Hugo POC's feed), generated at build time.
import { getPosts, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/content";

export const dynamic = "force-static";

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function GET() {
  const items = getPosts()
    .map(
      (p) => `<item><title>${esc(p.title)}</title><link>${p.permalink}</link><guid>${p.permalink}</guid>` +
        (p.date ? `<pubDate>${p.date.toUTCString()}</pubDate>` : "") +
        `<description>${esc(p.description)}</description></item>`,
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>${esc(SITE_TITLE)}</title>` +
    `<link>${SITE_URL}</link><description>${esc(SITE_DESCRIPTION)}</description><language>en-SG</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
