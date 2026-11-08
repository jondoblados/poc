// Copies static/ (logo, hero) to public/, then page-bundle images from content/ to public/ as WebP (max 1200px wide) and
// writes lib/image-manifest.json with dimensions, so pages get width/height (no layout shift).
// Same processing the Hugo POC did in layouts/_markup/render-image.html.
// Social-preview (og:image) copies are written as JPG, which Facebook/LinkedIn handle everywhere.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const contentDir = path.join(root, "content");
const publicDir = path.join(root, "public");
const manifest = {};

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(png|jpe?g|gif|webp)$/i.test(e.name)) yield p;
  }
}

await fs.rm(publicDir, { recursive: true, force: true });
// Site assets that are not edited in Google Docs (logo, homepage hero) live in static/.
await fs.cp(path.join(root, "static"), publicDir, { recursive: true });
let n = 0;
for await (const file of walk(contentDir)) {
  const rel = path.relative(contentDir, file).split(path.sep).join("/");
  const outRel = rel.replace(/\.[^.]+$/, ".webp");
  const out = path.join(publicDir, outRel);
  await fs.mkdir(path.dirname(out), { recursive: true });
  const img = sharp(file).rotate().resize({ width: 1200, withoutEnlargement: true });
  const info = await img.clone().webp({ quality: 82 }).toFile(out);
  const entry = { src: outRel, width: info.width, height: info.height };
  if (/(^|\/)cover\.[^/]+$/.test(rel)) {
    const ogRel = rel.replace(/\.[^.]+$/, ".og.jpg");
    const og = await img.clone().flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toFile(path.join(publicDir, ogRel));
    entry.og = { src: ogRel, width: og.width, height: og.height };
  }
  manifest[rel] = entry;
  n++;
}
await fs.writeFile(path.join(root, "lib", "image-manifest.json"), JSON.stringify(manifest, null, 1));
await fs.writeFile(path.join(publicDir, ".nojekyll"), "");
console.log(`prepare-images: ${n} image(s) -> public/ (WebP)`);
