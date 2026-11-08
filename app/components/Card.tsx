import Link from "next/link";
import { BASE, shortDate, type Page } from "@/lib/content";

const strip = (u: string) => u.slice(BASE.length);

export default function Card({ page }: { page: Page }) {
  return (
    <article className="card">
      <Link href={strip(page.url)}>
        {page.cover && (
          <img src={`${BASE}/${page.cover.src}`} width={page.cover.width} height={page.cover.height} alt="" loading="lazy" />
        )}
        <div className="card-body">
          <p className="meta">
            {page.categories.map((c) => (
              <span className="tag" key={c}>{c}</span>
            ))}{" "}
            {shortDate(page.date)}
          </p>
          <h3>{page.title}</h3>
          <p>{page.description}</p>
        </div>
      </Link>
    </article>
  );
}
