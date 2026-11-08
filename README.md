# POC2: Google Docs → Next.js → GitHub Pages

Branch `poc2` of this repository. Same Google Docs publishing workflow as the Hugo POC (`main`, live at
https://jon.doblados.net/poc/), but the website itself is a **Next.js (React) app**, exported as static files and
published at **https://jon.doblados.net/ambsaas/**.

| | POC1 (`main`) | POC2 (`poc2`) |
|---|---|---|
| Editing | Google Docs in the LIVE Drive folder | unchanged |
| Docs → content | `scripts/drive_to_hugo.py` → `content/` page bundles | unchanged (content is taken from `main`) |
| Website | Hugo templates (`layouts/`) | Next.js App Router + React (`app/`, `lib/content.ts`) |
| Output | `hugo` → `public/` | `next build` (`output: "export"`) → `out/` |
| Hosting | GitHub Pages, repo `poc` → `/poc/` | GitHub Pages, repo [`ambsaas`](https://github.com/jondoblados/ambsaas) → `/ambsaas/` |

## How it works

```
Google Docs (LIVE)  ──every 15 min──►  main: drive_to_hugo.py → content/ + data/   (POC1 workflow, unchanged;
                                                                                   it also comments on the Docs)
jondoblados/ambsaas workflow (every 15 min 08:00-24:00 SGT, daily 00:05 SGT, or "Run workflow"):
  1. checkout poc@poc2 (website code)  +  content/ and data/ from poc@main (latest Drive content)
  2. skip if neither has changed since the last deploy (reads /ambsaas/build.json)
  3. npm ci && npm run build
       scripts/prepare-images.mjs   images → WebP (max 1200 px) + JPG social previews, with dimensions
       lib/content.ts               reads front matter + Markdown, renders and sanitises HTML (raw HTML dropped)
       app/                         React layouts: home, pages, sections with drop-down menus, posts, RSS
  4. actions/deploy-pages → https://jon.doblados.net/ambsaas/
```

Drive access, Workload Identity Federation and "Published: …" comments stay on `main` only, so the Docs do not get
duplicate comments and no new Google permissions are needed for POC2.

## Develop locally

```bash
npm ci
npm run dev                     # http://localhost:3000/ambsaas/
npm run build                   # static site in out/
BASE_PATH= npm run build        # build for a domain root (e.g. a future production host)
```

To preview the latest Drive content locally: `git checkout origin/main -- content data` (do not commit it on `poc2`).

## What is the same as POC1

URLs (`/ambsaas/<page>/`, `/ambsaas/posts/<slug>/`), menu and drop-downs from Drive folders, section pages with
sub-page cards, cover images, event date and Sign up button, Facebook/LinkedIn share links and Open Graph tags,
RSS at `/ambsaas/index.xml`, and future-dated posts hidden until 00:00 SGT on their Publish date.

## What is new

- React components (`app/components/`), with a client-side menu (current-page highlight, mobile Menu button) and
  client-side navigation between pages.
- Content model in `lib/content.ts` is independent of Hugo, so a later step can replace the Markdown hand-off with
  structured output from the Drive converter.
