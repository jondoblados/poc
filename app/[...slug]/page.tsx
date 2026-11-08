import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Card, { href, Tile } from "../components/Card";
import Wave from "../components/Wave";
import { Facebook, LinkedIn } from "../components/icons";
import { BASE, getChildren, getPage, getPages, getParent, longDate, SITE_URL, type Page } from "@/lib/content";

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

/** Grey header band: eyebrow + main heading + intro, taken from the top of the Doc. */
function PageHero({ page, children }: { page: Page; children?: React.ReactNode }) {
  // Team profiles are linked from About, so that is their parent in the breadcrumb
  const parent = page.section === "team" ? getPage(["about-ambsaas"]) : getParent(page);
  const sameAsTitle = page.heading && page.heading.toLowerCase() === page.title.toLowerCase();
  const leadStartsGold = /^<h[34]/.test(page.leadHtml);
  const eyebrow = page.heading && !sameAsTitle ? page.title : parent?.title ?? "AMBSAAS";
  return (
    <section className="page-hero">
      <div className="container">
        {parent && (
          <p className="crumbs"><Link href="/">Home</Link> / <Link href={href(parent)}>{parent.title}</Link></p>
        )}
        {children ?? (
          <>
            {!leadStartsGold && <p className="eyebrow">{eyebrow}</p>}
            {page.heading ? (
              <div dangerouslySetInnerHTML={{ __html: page.leadHtml }} />
            ) : (
              <>
                <h1>{page.title}</h1>
                {page.leadHtml && <div dangerouslySetInnerHTML={{ __html: page.leadHtml }} />}
              </>
            )}
          </>
        )}
      </div>
      <Wave />
    </section>
  );
}

export default async function ContentPage({ params }: Props) {
  const page = getPage((await params).slug);
  if (!page) notFound();
  const children = page.isSection ? getChildren(page) : [];
  const isPost = page.section === "posts";

  // News list (/posts/)
  if (page.isSection && isPost) {
    return (
      <>
        <PageHero page={page}>
          <p className="eyebrow">Save the Date</p>
          <h1>{page.title === "News" ? "News & Events" : page.title}</h1>
        </PageHero>
        <section className="page-body">
          <div className="container">
            {page.html && <div className="content" dangerouslySetInnerHTML={{ __html: page.html }} />}
            <div className="cards">{children.map((c) => <Card key={c.path} page={c} />)}</div>
          </div>
        </section>
      </>
    );
  }

  // A news post / event
  if (isPost) {
    const share = encodeURIComponent(page.permalink);
    return (
      <>
        <PageHero page={page}>
          <p className="post-meta">
            {page.categories.map((c) => <span className="tag" key={c}>{c}</span>)}
            <span>{longDate(page.date)}</span>
          </p>
          <h1>{page.title}</h1>
          {page.description && <p>{page.description}</p>}
        </PageHero>
        <section className="page-body">
          <div className={`container post-layout${page.cover ? "" : " no-cover"}`}>
            {page.cover && (
              <div className="post-cover">
                <img src={`${BASE}/${page.cover.src}`} width={page.cover.width} height={page.cover.height} alt={page.title} />
              </div>
            )}
            <div>
              {(page.eventDate || page.signup) && (
                <div className="event-box">
                  {page.eventDate && <p className="when"><span>When</span><strong>{page.eventDate}</strong></p>}
                  {page.signup && <a className="button" href={page.signup} rel="noopener">Sign up</a>}
                </div>
              )}
              {/* HTML comes from Google Docs Markdown, rendered and sanitised at build time (lib/content.ts) */}
              <div className="content" dangerouslySetInnerHTML={{ __html: page.html }} />
              <div className="share">
                <span>Share</span>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${share}`} rel="noopener" target="_blank" aria-label="Share on Facebook"><Facebook /></a>
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${share}`} rel="noopener" target="_blank" aria-label="Share on LinkedIn"><LinkedIn /></a>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  // Council member profile (Team folder): photo beside the text
  if (page.section === "team" && !page.isSection) {
    const photo = page.thumb;
    const html = photo ? page.html.replace(/^<figure class="figure">[\s\S]*?<\/figure>/, "") : page.html;
    const about = getPage(["about-ambsaas"]);
    return (
      <>
        <PageHero page={page}>
          <p className="eyebrow">{about ? <Link href={href(about)} style={{ color: "inherit", textDecoration: "none" }}>Council</Link> : "Council"}</p>
          <h1>{page.title}</h1>
        </PageHero>
        <section className="page-body">
          <div className={`container ${photo ? "person" : ""}`}>
            {photo && (
              <div className="person-photo">
                <img src={`${BASE}/${photo.src}`} width={photo.width} height={photo.height} alt={page.title} />
              </div>
            )}
            <div className="content" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </section>
      </>
    );
  }

  // Regular page or section page
  return (
    <>
      <PageHero page={page} />
      <section className="page-body">
        <div className="container">
          {page.html.trim() && <div className="content" dangerouslySetInnerHTML={{ __html: page.html }} />}
          {children.length > 0 && (
            <div className="tiles subpages">{children.map((c) => <Tile key={c.path} page={c} />)}</div>
          )}
        </div>
      </section>
    </>
  );
}
