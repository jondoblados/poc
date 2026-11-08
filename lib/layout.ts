// Turns the plain HTML that comes from a Google Doc into the mbsaas.org-style layout, using only the
// structure editors already write. No special markup is needed in the Docs:
//
//   image, then a heading, then text (2+ in a row)  -> feature cards in a 3-column grid  (Membership benefits)
//   2+ images on their own lines                    -> photo gallery                     (event photos)
//   image + name/role on the same line (Shift+Enter) -> profile cards                     (Council members)
//   a single image on its own line                  -> centred figure
//   a line that is only a link                      -> gold button                       ("Join Us Now")
//   headings + short intro at the top of a page     -> page header band (see splitLead)
import type { Element, ElementContent, Root, RootContent } from "hast";

type Node = RootContent;
const el = (tagName: string, className: string[], children: ElementContent[]): Element => ({
  type: "element",
  tagName,
  properties: { className },
  children,
});
const isEl = (n: any, ...tags: string[]): n is Element => n?.type === "element" && (!tags.length || tags.includes(n.tagName));
const isWs = (n: any) => n?.type === "text" && !n.value.trim();
const heading = (n: any, ...levels: number[]) =>
  isEl(n) && /^h[1-6]$/.test(n.tagName) && (!levels.length || levels.includes(Number(n.tagName[1])));
const content = (n: Element) => n.children.filter((c) => !isWs(c));
const imgs = (n: Element) => content(n).filter((c) => isEl(c, "img")) as Element[];
/** <p> that holds only images (and line breaks) */
const imageOnly = (n: any): n is Element =>
  isEl(n, "p") && imgs(n).length > 0 && content(n).every((c) => isEl(c, "img", "br"));
/** <p> with an image plus other inline content on the same line */
const imageWithText = (n: any): n is Element => isEl(n, "p") && imgs(n).length > 0 && !imageOnly(n);
const textOf = (n: any): string => (n.type === "text" ? n.value : (n.children ?? []).map(textOf).join(""));

function trimBr(nodes: ElementContent[]) {
  const out = [...nodes];
  while (out.length && (isEl(out[0], "br") || isWs(out[0]))) out.shift();
  while (out.length && (isEl(out[out.length - 1], "br") || isWs(out[out.length - 1]))) out.pop();
  return out;
}

function features(nodes: Node[]): Node[] {
  const out: Node[] = [];
  let i = 0;
  while (i < nodes.length) {
    const groups: Node[][] = [];
    let j = i;
    while (imageOnly(nodes[j]) && imgs(nodes[j] as Element).length === 1 && heading(nodes[j + 1], 3, 4, 5, 6)) {
      const g: Node[] = [nodes[j], nodes[j + 1]];
      j += 2;
      while (j < nodes.length && !imageOnly(nodes[j]) && !heading(nodes[j], 1, 2, 3)) g.push(nodes[j++]);
      groups.push(g);
    }
    if (groups.length >= 2) {
      out.push(el("div", ["features"], groups.map((g) => el("div", ["feature"], g as ElementContent[]))));
      i = j;
    } else out.push(nodes[i++]);
  }
  return out;
}

function galleries(nodes: Node[]): Node[] {
  const out: Node[] = [];
  let i = 0;
  while (i < nodes.length) {
    if (!imageOnly(nodes[i])) { out.push(nodes[i++]); continue; }
    const run: Element[] = [];
    while (imageOnly(nodes[i])) run.push(...imgs(nodes[i++] as Element));
    if (run.length >= 2) {
      out.push(el("div", [run.length === 2 ? "gallery gallery-2" : "gallery"], run.map((img) => el("figure", [], [img]))));
    } else out.push(el("figure", ["figure"], run));
  }
  return out;
}

function profiles(nodes: Node[]): Node[] {
  const out: Node[] = [];
  let i = 0;
  while (i < nodes.length) {
    if (!imageWithText(nodes[i])) { out.push(nodes[i++]); continue; }
    const cards: Element[] = [];
    while (imageWithText(nodes[i])) {
      let cur: ElementContent[] | null = null;
      for (const c of (nodes[i] as Element).children) {
        if (isEl(c, "img")) {
          if (cur) cards.push(card(cur));
          cur = [c];
        } else if (cur) cur.push(c);
      }
      if (cur) cards.push(card(cur));
      i++;
    }
    out.push(el("div", ["profiles"], cards));
  }
  return out;
  function card([img, ...rest]: ElementContent[]) {
    const body = trimBr(rest);
    const link = body.find((c) => isEl(c, "a")) as Element | undefined;
    const photo = link ? el("a", ["profile-photo"], [img]) : el("div", ["profile-photo"], [img]);
    if (link) photo.properties.href = link.properties.href;
    return el("div", ["profile"], [photo, el("div", ["profile-body"], body)]);
  }
}

function buttons(nodes: Node[]): Node[] {
  for (const n of nodes) {
    if (!isEl(n, "p")) continue;
    const kids = content(n);
    const only = kids.length === 1 ? kids[0] : null;
    const a = isEl(only, "a") ? only : isEl(only, "strong") && content(only).length === 1 && isEl(content(only)[0], "a") ? (content(only)[0] as Element) : null;
    if (a && textOf(a).trim().length <= 40) {
      n.properties.className = ["cta"];
      a.properties.className = ["button"];
    }
  }
  return nodes;
}

/** Applies the layout rules to the top level of the document body. */
export function applyLayout(tree: Root) {
  let nodes = tree.children.filter((n) => !isWs(n));
  nodes = features(nodes);
  nodes = galleries(nodes);
  nodes = profiles(nodes);
  nodes = buttons(nodes);
  tree.children = nodes;
}

/**
 * Splits the top of a page into the header band, like mbsaas.org: leading headings plus one short intro
 * paragraph. Returns the lead nodes and the remaining body. The first h2 becomes the page's main heading.
 */
export function splitLead(tree: Root): { lead: Root; body: Root; heading?: string } {
  const nodes = tree.children.filter((n) => !isWs(n));
  const lead: Node[] = [];
  let i = 0, paras = 0, headingText: string | undefined;
  while (i < nodes.length) {
    const n = nodes[i];
    if (heading(n, 1, 2, 3, 4)) {
      if (heading(n, 1, 2)) {
        if (headingText) break; // a second main heading starts the body
        headingText = textOf(n).trim();
      }
      lead.push(n); i++;
    } else if (isEl(n, "p") && !imgs(n).length && paras === 0 && lead.length && textOf(n).length < 500 && !isEl(content(n)[0], "a")) {
      lead.push(n); i++; paras++;
    } else break;
  }
  if (!lead.length || !lead.some((n) => heading(n))) return { lead: { type: "root", children: [] }, body: tree };
  // h1/h2 in the lead -> rendered as the page <h1>
  for (const n of lead) if (heading(n, 1, 2)) (n as Element).tagName = "h1";
  return { lead: { type: "root", children: lead }, body: { type: "root", children: nodes.slice(i) }, heading: headingText };
}

