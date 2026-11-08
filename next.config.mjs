// POC2: Next.js replaces Hugo. Static export -> out/ (served by GitHub Pages at /ambsaas/).
const basePath = process.env.BASE_PATH ?? "/ambsaas";

/** @type {import('next').NextConfig} */
export default {
  output: "export",
  basePath,
  trailingSlash: true, // /ambsaas/membership/ -> membership/index.html (same URLs as the Hugo POC)
  images: { unoptimized: true }, // no image server on GitHub Pages; images are pre-processed by scripts/prepare-images.mjs
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SITE_URL: process.env.SITE_URL ?? `https://jon.doblados.net${basePath}/`,
  },
};
