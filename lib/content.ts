// Reads the page bundles that scripts/drive_to_hugo.py writes from Google Docs (content/**/index.md,
// content/**/_index.md) and turns them into a renderer-independent model for the Next.js pages.
// The Drive converter is unchanged; only the website layer moved from Hugo templates to React.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import { toHtml } from "hast-util-to-html";
import { applyLayout, splitLead } from "./layout";
import { visit } from "unist-util-visit";
import imageManifest from "./image-manifest.json";

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jon.doblados.net/ambsaas/";
export const SITE_TITLE = "AMBSAAS (POC2)";
export const SITE_DESCRIPTION =
  "Alliance Manchester Business School Alumni Association of Singapore - website POC2 (Google Docs -> Next.js -> GitHub Pages)";

type Img = { src: string; width: number; height: number; og?: { src: string; width: number; height: number } };
const images = imageManifest as Record<string, Img>;

export type Page = {
  path: string; // "events/community-events" (no leading/trailing slash)
  slug: string[];
  url: string; // "/ambsaas/events/community-events/"
  permalink: string; // absolute URL
  isSection: boolean; // from _index.md (has child pages)
  section: string; // first path segment
  title: string;
  description: string;
  weight: number;
  date: Date | null;
  categories: string[];
  eventDate?: string;
  signup?: string;
  menu?: { weight: number; parent?: string; identifier: string };
  driveId?: string;
  cover?: Img;
  thumb?: Img; // cover, or the first image in the Doc (used on section cards)
  html: string;
  leadHtml: string; // headings + intro shown in the page header band
  heading?: string;
};

const CONTENT = path.join(process.cwd(), "content");

/** Resolve a page-relative image (e.g. "image1.png" in content/membership/) to its processed WebP. */
function resolveImage(pagePath: string, src: string): Img | undefined {
  if (/^([a-z]+:)?\/\//i.test(src) || src.startsWith("/") || src.startsWith("data:")) return undefined;
  const rel = path.posix.normalize(path.posix.join(pagePath, decodeURI(src)));
  return images[rel];
}

const OLD_SITE = /^https?:\/\/jon\.doblados\.net\/poc\//; // links in Docs that point at the Hugo POC

type Rendered = { html: string; leadHtml: string; heading?: string; firstImage?: Img };

function render(md: string, pagePath: string, withLead: boolean): Rendered {
  let firstImage: Img | undefined;
  const rewrite = () => (tree: any) => {
    visit(tree, "element", (node: any) => {
      if (node.tagName === "img") {
        const img = resolveImage(pagePath, String(node.properties.src ?? ""));
        if (img) {
          Object.assign(node.properties, { src: `${BASE}/${img.src}`, width: img.width, height: img.height });
          firstImage ??= img;
        }
        node.properties.loading = "lazy";
      } else if (node.tagName === "a" && typeof node.properties.href === "string") {
        const href: string = node.properties.href;
        if (OLD_SITE.test(href)) node.properties.href = href.replace(OLD_SITE, `${BASE}/`);
        else if (/^https?:/.test(href)) node.properties.rel = "noopener";
      }
    });
  };
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype) // raw HTML in Docs is dropped, never rendered (same as Hugo's unsafe=false)
    .use(rehypeSanitize)
    .use(rewrite);
  const tree = processor.runSync(processor.parse(md)) as any;
  const { lead, body, heading } = withLead ? splitLead(tree) : { lead: { type: "root", children: [] } as any, body: tree, heading: undefined };
  applyLayout(body);
  return { html: toHtml(body), leadHtml: toHtml(lead), heading, firstImage };
}

function* walk(dir: string): Generator<string> {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name === "index.md" || e.name === "_index.md") yield p;
  }
}

let cache: Page[] | null = null;

export function getPages(): Page[] {
  if (cache) return cache;
  const now = Date.now();
  const pages: Page[] = [];
  for (const file of walk(CONTENT)) {
    const dir = path.relative(CONTENT, path.dirname(file)).split(path.sep).join("/");
    if (!dir) continue;
    const { data, content } = matter(fs.readFileSync(file, "utf8"));
    const date = data.date ? new Date(data.date) : null;
    // Future-dated posts stay hidden until 00:00 Singapore time on their Publish date (daily rebuild at 00:05 SGT).
    if (date && date.getTime() - 8 * 3600e3 > now) continue;
    const m = data.menus?.main;
    const coverKey = Object.keys(images).find((k) => k.startsWith(`${dir}/cover.`));
    const url = `${BASE}/${dir}/`;
    const section = dir.split("/")[0];
    const cover = coverKey ? images[coverKey] : undefined;
    const r = render(content, dir, section !== "posts" && section !== "team");
    pages.push({
      path: dir,
      slug: dir.split("/"),
      url,
      permalink: new URL(`${dir}/`, SITE_URL).toString(),
      isSection: path.basename(file) === "_index.md",
      section,
      title: String(data.title ?? dir),
      description: String(data.description ?? ""),
      weight: Number(data.weight ?? 0),
      date,
      categories: Array.isArray(data.categories) ? data.categories.map(String) : [],
      eventDate: data.eventDate,
      signup: data.signup,
      menu: m ? { weight: Number(m.weight ?? 0), parent: m.parent, identifier: m.identifier ?? dir.split("/").pop()! } : undefined,
      driveId: data.driveId,
      cover,
      thumb: cover ?? r.firstImage,
      html: r.html,
      leadHtml: r.leadHtml,
      heading: r.heading,
    });
  }
  return (cache = pages);
}

/** Hugo's default order: weight (0 = last), then newest date, then title. */
function byWeight(a: Page, b: Page) {
  const wa = a.weight || Infinity, wb = b.weight || Infinity;
  if (wa !== wb) return wa - wb;
  const da = a.date?.getTime() ?? 0, db = b.date?.getTime() ?? 0;
  if (da !== db) return db - da;
  return a.title.localeCompare(b.title);
}

export const getPage = (slug: string[]) => getPages().find((p) => p.path === slug.join("/"));

export const getChildren = (p: Page) =>
  getPages().filter((c) => path.posix.dirname(c.path) === p.path).sort(byWeight);

export const getPosts = () => getPages().filter((p) => p.section === "posts" && !p.isSection).sort(byWeight);

export const getParent = (p: Page) => (p.slug.length > 1 ? getPage(p.slug.slice(0, -1)) : undefined);

export type MenuItem = { name: string; url: string; children: MenuItem[] };

/** Main menu from front matter (menus.main), same as the Hugo site: folders with a section Doc get a drop-down. */
export function getMenu(): MenuItem[] {
  const items = getPages().filter((p) => p.menu);
  const sort = (a: Page, b: Page) => a.menu!.weight - b.menu!.weight || a.title.localeCompare(b.title);
  const home: MenuItem = { name: "Home", url: `${BASE}/`, children: [] };
  return [home, ...items
    .filter((p) => !p.menu!.parent)
    .sort(sort)
    .map((p) => ({
      name: p.title,
      url: p.url,
      children: items
        .filter((c) => c.menu!.parent === p.menu!.identifier)
        .sort(sort)
        .map((c) => ({ name: c.title, url: c.url, children: [] })),
    }))];
}

const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
export const shortDate = (d: Date | null) => (d ? fmt(d, { day: "numeric", month: "short", year: "numeric" }) : "");
export const longDate = (d: Date | null) =>
  d ? fmt(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
