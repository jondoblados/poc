import { BASE, getPages } from "@/lib/content";
import TeamCarouselClient from "./TeamCarouselClient";

export default function TeamCarousel() {
  const members = getPages()
    .filter((p) => p.section === "team" && !p.isSection && p.slug.length === 2)
    .sort((a, b) => (a.weight || Infinity) - (b.weight || Infinity) || a.title.localeCompare(b.title))
    .map((p) => ({
      path: `/${p.path}`,
      title: p.title,
      roleHtml: p.html.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1] ?? "",
      description: p.description,
      photo: p.thumb ? { src: `${BASE}/${p.thumb.src}`, width: p.thumb.width, height: p.thumb.height } : null,
    }));
  return <TeamCarouselClient members={members} base={BASE} />;
}
