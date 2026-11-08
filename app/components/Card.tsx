import Link from "next/link";
import { BASE, shortDate, type Page } from "@/lib/content";

export const href = (p: Page) => p.url.slice(BASE.length);

/** News/event card (posts) */
export default function Card({ page }: { page: Page }) {
  return (
    <article className="card">
      <Link href={href(page)}>
        <div className="card-media">
          {page.thumb && <img src={`${BASE}/${page.thumb.src}`} width={page.thumb.width} height={page.thumb.height} alt="" loading="lazy" />}
        </div>
        <div className="card-body">
          <p className="card-meta">
            {page.categories.map((c) => <span className="tag" key={c}>{c}</span>)}
            <span>{shortDate(page.date)}</span>
          </p>
          <h3>{page.title}</h3>
          <p>{page.description}</p>
          <span className="card-more">Read more →</span>
        </div>
      </Link>
    </article>
  );
}

/** Photo tile with the title over it (section sub-pages, e.g. Events -> Signature Events) */
export function Tile({ page }: { page: Page }) {
  // small illustrations (e.g. icons) look poor stretched over a tile; use the plain purple tile instead
  const photo = page.thumb && page.thumb.width >= 600 ? page.thumb : undefined;
  return (
    <Link className={`tile${photo ? "" : " tile-plain"}`} href={href(page)}>
      {photo && <img src={`${BASE}/${photo.src}`} width={photo.width} height={photo.height} alt="" loading="lazy" />}
      <span className="tile-body">
        <strong>{page.title}</strong>
        {page.description && <span>{page.description}</span>}
      </span>
    </Link>
  );
}
