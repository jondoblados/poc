// Home page copy from the "Home" Doc (LIVE > Pages > Home -> content/home/index.md).
//
// The Doc has one Heading 1 per home section (Banner, Follow us, Mission, Values, Latest news, Explore, Join us).
// Under each heading is a small "Field | Value" table, then (Mission, Values) normal text and pictures.
// Anything missing or left blank falls back to the defaults below, so the site never shows an empty section.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import { toHtml } from "hast-util-to-html";
import { visit } from "unist-util-visit";
import { CONTENT, HOME_DIR, resolveImage, siteLink, type Img } from "./content";

export type Button = { text: string; href: string };
export type Head = { label: string; heading: string };
export type Home = {
  banner: Head & { button?: Button };
  follow: { heading: string; button?: Button };
  mission: Head & { button?: Button; html: string; photos: Img[] };
  values: Head & { items: { title: string; text: string }[] };
  news: Head & { button?: Button; count: number };
  explore: Head;
  join: { heading: string; button?: Button };
};

const DEFAULTS: Home = {
  banner: { label: "AMBSAAS", heading: "Power Your Network for Your Future.", button: { text: "Join Us", href: "/membership/" } },
  follow: {
    heading: "Stay connected. Follow AMBSAAS for news and events!",
    button: { text: "Follow on LinkedIn", href: "https://www.linkedin.com/company/mbsaas/" },
  },
  mission: {
    label: "OUR MISSION",
    heading: "The Alliance Manchester Business School Alumni Association of Singapore",
    button: { text: "About AMBSAAS", href: "/about-ambsaas/" },
    html:
      "<p>The Alliance Manchester Business School Alumni Association of Singapore, AMBSAAS, aims to support lifelong relationships between the alumni and our alma mater.</p>" +
      "<p>AMBSAAS is about the leverage of network: professional networking, entrepreneurial advisory and more, and giving back to the community through initiatives such as the Manchester Day of Action.</p>",
    photos: [],
  },
  values: {
    label: "OUR VALUES",
    heading: "Connect, collaborate and grow with AMBS alumni",
    items: [
      { title: "Connect", text: "To channel the alumni into a vibrant network of high-potential people" },
      { title: "Collaborate", text: "A platform for ideation and joint opportunities" },
      { title: "Commerce", text: "Enabling and supporting the success of business-minded individuals in our network" },
    ],
  },
  news: { label: "Save the Date", heading: "Latest News & Events", button: { text: "All news", href: "/posts/" }, count: 6 },
  explore: { label: "Explore", heading: "As an AMBS alumnus, you are supported." },
  join: { heading: "Be part of the AMBSAAS Community today!", button: { text: "Contact Us", href: "/contact-us/" } },
};

const text = (n: any): string => (n.value ?? "") + (n.children ?? []).map(text).join("");
const isPlaceholder = (v: string) => /^\(.*\)$/.test(v.trim()); // "(optional ...)" hints in the template

/** Field | Value table -> { "small text": "AMBSAAS", ... }; a link in a cell gives its URL. */
function tableFields(table: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of table.children) {
    const [k, v] = row.children;
    if (!k || !v) continue;
    const key = text(k).trim().toLowerCase().replace(/:$/, "");
    let link: string | undefined;
    visit(v, "link", (n: any) => { link ??= n.url; });
    const val = (link ?? text(v)).trim();
    if (key && key !== "field" && val && !isPlaceholder(val)) out[key] = val;
  }
  return out;
}

function htmlOf(nodes: any[]): string {
  const p = unified().use(remarkRehype).use(rehypeSanitize);
  const tree = p.runSync({ type: "root", children: nodes } as any) as any;
  visit(tree, "element", (n: any) => {
    if (n.tagName === "a" && typeof n.properties.href === "string") {
      n.properties.href = siteLink(n.properties.href);
      if (/^https?:/.test(n.properties.href)) n.properties.rel = "noopener";
    }
  });
  return toHtml(tree);
}

const button = (f: Record<string, string>, d?: Button): Button | undefined => {
  if ((f["button text"] ?? "").toLowerCase() === "none") return undefined; // "none" hides the button
  const b = { text: f["button text"] ?? d?.text ?? "", href: f["button link"] ?? d?.href ?? "" };
  return b.text && b.href ? b : undefined;
};
const head = (f: Record<string, string>, d: Head): Head => ({ label: f["small text"] ?? d.label, heading: f["heading"] ?? d.heading });

function withLinks(h: Home): Home {
  for (const s of Object.values(h) as any[]) if (s.button) s.button = { ...s.button, href: siteLink(s.button.href) };
  return h;
}

let cache: Home | null = null;

export function getHome(): Home {
  if (cache) return cache;
  const file = path.join(CONTENT, HOME_DIR, "index.md");
  if (!fs.existsSync(file)) return (cache = withLinks(structuredClone(DEFAULTS)));

  const { content } = matter(fs.readFileSync(file, "utf8"));
  const tree: any = unified().use(remarkParse).use(remarkGfm).parse(content);

  // split the Doc at each Heading 1
  const sections: Record<string, any[]> = {};
  let current: any[] | null = null;
  for (const n of tree.children) {
    if (n.type === "heading" && n.depth === 1) {
      const name = text(n).trim().toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ");
      current = sections[name] = [];
    } else current?.push(n);
  }
  const part = (...names: string[]) => {
    const nodes = names.map((n) => sections[n]).find(Boolean) ?? [];
    const table = nodes.find((n) => n.type === "table");
    return { fields: table ? tableFields(table) : {}, rest: nodes.filter((n) => n !== table) };
  };
  const d = DEFAULTS;

  const banner = part("banner");
  const follow = part("follow us", "follow");
  const mission = part("mission", "our mission");
  const values = part("values", "our values");
  const news = part("latest news", "news");
  const explore = part("explore");
  const join = part("join us", "join");

  // Mission: text and up to 2 photos from the Doc
  const photos: Img[] = [];
  const textNodes = mission.rest.filter((n) => {
    let only = n.type === "paragraph";
    visit(n, "image", (img: any) => {
      const r = resolveImage(HOME_DIR, img.url);
      if (r && photos.length < 2) photos.push(r);
    });
    if (only) only = n.children.every((c: any) => c.type === "image" || (c.type === "text" && !c.value.trim()));
    return !only && !isPlaceholder(text(n));
  });

  // Values: each Heading 2/3 followed by its text is one value
  const items: { title: string; text: string }[] = [];
  for (const n of values.rest) {
    if (n.type === "heading" && n.depth > 1) items.push({ title: text(n).trim(), text: "" });
    else if (n.type === "paragraph" && items.length && !isPlaceholder(text(n)))
      items[items.length - 1].text = [items[items.length - 1].text, text(n).trim()].filter(Boolean).join(" ");
  }

  const count = parseInt(news.fields["number of posts"] ?? "", 10);
  return (cache = withLinks({
    banner: { ...head(banner.fields, d.banner), button: button(banner.fields, d.banner.button) },
    follow: { heading: follow.fields["heading"] ?? d.follow.heading, button: button(follow.fields, d.follow.button) },
    mission: {
      ...head(mission.fields, d.mission),
      button: button(mission.fields, d.mission.button),
      html: textNodes.length ? htmlOf(textNodes) : d.mission.html,
      photos,
    },
    values: { ...head(values.fields, d.values), items: items.filter((i) => i.title).slice(0, 6).length ? items.filter((i) => i.title).slice(0, 6) : d.values.items },
    news: { ...head(news.fields, d.news), button: button(news.fields, d.news.button), count: count > 0 ? Math.min(count, 12) : d.news.count },
    explore: head(explore.fields, d.explore),
    join: { heading: join.fields["heading"] ?? d.join.heading, button: button(join.fields, d.join.button) },
  }));
}
