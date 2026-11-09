import type { Element, ElementContent, Root, RootContent } from "hast";

type Node = RootContent;
const isElement = (node: Node, tag?: string): node is Element => node.type === "element" && (!tag || node.tagName === tag);
const blocks = new Set(["p", "div", "section", "article", "blockquote", "ul", "ol", "pre", "table", "figure", "hr", "h1", "h2", "h3", "h4", "h5", "h6"]);

function meaningful(node: Node): boolean {
  if (node.type === "text") return /\S/.test(node.value);
  if (!isElement(node)) return false;
  if (["img", "video", "audio", "iframe", "svg", "hr", "input"].includes(node.tagName)) return true;
  return node.children.some(meaningful);
}

function unwrap(table: Element): Node[] {
  const rows: Element[] = [];
  // Only unwrap simple single-column tables, never captions, spanning cells
  // or genuine multi-column data. Header-cell emphasis is not invented.
  for (const child of table.children) {
    if (child.type === "text" && !child.value.trim()) continue;
    if (!isElement(child)) return [table];
    if (child.tagName === "tr") rows.push(child);
    else if (["thead", "tbody", "tfoot"].includes(child.tagName)) {
      for (const row of child.children) {
        if (row.type === "text" && !row.value.trim()) continue;
        if (!isElement(row, "tr")) return [table];
        rows.push(row);
      }
    } else return [table];
  }
  if (!rows.length) return [table];
  const cells: Element[] = [];
  for (const row of rows) {
    const children = row.children.filter((n) => !(n.type === "text" && !n.value.trim()));
    if (children.length !== 1) return [table];
    const cell = children[0];
    if (!isElement(cell) || !["th", "td"].includes(cell.tagName)) return [table];
    if (Number(cell.properties.colSpan ?? 1) !== 1 || Number(cell.properties.rowSpan ?? 1) !== 1) return [table];
    cells.push(cell);
  }
  const result: Node[] = [];
  for (const cell of cells) {
    let inline: ElementContent[] = [];
    const flush = () => {
      if (inline.some(meaningful)) result.push({ type: "element", tagName: "p", properties: {}, children: inline });
      inline = [];
    };
    for (const child of cell.children) {
      if (isElement(child) && blocks.has(child.tagName)) {
        flush();
        if (meaningful(child)) result.push(child);
      } else inline.push(child);
    }
    flush();
  }
  return result;
}

export function normalizeLayoutTables(tree: Root): void {
  const normalize = (nodes: Node[]): Node[] => nodes.flatMap((node): Node[] => {
    if (!isElement(node)) return [node];
    node.children = normalize(node.children) as ElementContent[];
    return node.tagName === "table" ? unwrap(node) : [node];
  });
  tree.children = normalize(tree.children);
}
