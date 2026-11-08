import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Card from "../components/Card";
import { BASE, getChildren, getPage, getPages, longDate, SITE_URL } from "@/lib/content";

export const dynamicParams = false; // only pages that exist in content/ (static export)

export function generateStaticParams() {
  return getPages().map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getPage((await params).slug);
  if (!page) return {};
  const og = page.cover?.og;
  return {
    title: page.title,
    description: page.description || undefined,
    alternates: { canonical: page.permalink },
    openGraph: {
      title: page.title,
      description: page.description || undefined,
      url: page.permalink,
      type: page.isSection ? "website" : "article",
      images: og ? [{ url: new URL(og.src, SITE_URL).toString(), width: og.width, height: og.height }] : undefined,
    },
    twitter: og ? { card: "summary_large_image" } : undefined,
  };
}

export default async function ContentPage({ params }: Props) {
  const page = getPage((await params).slug);
  if (!page) notFound();
  const children = page.isSection ? getChildren(page) : [];
  const isPost = page.section === "posts";

  // News list (/posts/): cards, newest first
  if (page.isSection && isPost) {
    return (
      <>
        <h1>{page.title}</h1>
        <div className="content" dangerouslySetInnerHTML={{ __html: page.html }} />
        <div className="grid">{children.map((c) => <Card key={c.path} page={c} />)}</div>
      </>
    );
  }

  const share = encodeURIComponent(page.permalink);
  return (
    <article className="post">
      {isPost && (
        <p className="meta">
          {page.categories.map((c) => <span className="tag" key={c}>{c}</span>)} {longDate(page.date)}
        </p>
      )}
      <h1>{page.title}</h1>
      {page.eventDate && <p className="event"><strong>When:</strong> {page.eventDate}</p>}
      {page.cover && (
        <img className="cover" src={`${BASE}/${page.cover.src}`} width={page.cover.width} height={page.cover.height} alt={page.title} />
      )}
      {/* HTML comes from Google Docs Markdown, rendered and sanitised at build time (lib/content.ts) */}
      <div className="content" dangerouslySetInnerHTML={{ __html: page.html }} />
      {page.signup && <p><a className="button" href={page.signup} rel="noopener">Sign up</a></p>}
      {children.length > 0 && (
        <div className="subpages">
          {children.map((c) => (
            <Link className="subpage" href={c.url.slice(BASE.length)} key={c.path}>
              <strong>{c.title}</strong>
              {c.description && <span>{c.description}</span>}
            </Link>
          ))}
        </div>
      )}
      {isPost && !page.isSection && (
        <div className="share">
          <span>Share:</span>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${share}`} rel="noopener" target="_blank">Facebook</a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${share}`} rel="noopener" target="_blank">LinkedIn</a>
        </div>
      )}
    </article>
  );
}
