import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Card, { href, Tile } from "../components/Card";
import Wave from "../components/Wave";
import { Facebook, LinkedIn } from "../components/icons";
import { BASE, getChildren, getPage, getPages, getParent, longDate, SITE_URL, type Page } from "@/lib/content";

export const dynamicParams = false;
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
      title: page.title, description: page.description || undefined,
      url: page.permalink, type: page.isSection ? "website" : "article",
      images: og ? [{ url: new URL(og.src, SITE_URL).toString(), width: og.width, height: og.height }] : undefined,
    },
    twitter: og ? { card: "summary_large_image" } : undefined,
  };
}
function PageHero({ page, children }: { page: Page; children?: React.ReactNode }) {
  const parent = page.section === "team" ? getPage(["about-ambsaas"]) : getParent(page);
  const sameAsTitle = page.heading && page.heading.toLowerCase() === page.title.toLowerCase();
  const leadStartsGold = /^<h[34]/.test(page.leadHtml);
  const eyebrow = page.heading && !sameAsTitle ? page.title : parent?.title ?? "AMBSAAS";
  return (
    <section className="page-hero">
      <div className="container">
        {parent && <p className="crumbs"><Link href="/">Home</Link> / <Link href={href(parent)}>{parent.title}</Link></p>}
        {children ?? <>
          {!leadStartsGold && <p className="eyebrow">{eyebrow}</p>}
          {page.heading ? <div dangerouslySetInnerHTML={{ __html: page.leadHtml }} /> : <>
            <h1>{page.title}</h1>
            {page.leadHtml && <div dangerouslySetInnerHTML={{ __html: page.leadHtml }} />}
          </>}
        </>}
      </div>
      <Wave />
    </section>
  );
}

// The legacy council roster is the final section in the About Doc. Keep everything
// before that heading, but source the roster itself exclusively from team pages.
function withoutLegacyCouncil(html: string): string {
  const headings = html.matchAll(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi);
  for (const heading of headings) {
    const text = heading[0].replace(/<[^>]*>/g, "").trim();
    if (/^(?:meet (?:the )?)?council(?: members)?$/i.test(text)) {
      return html.slice(0, heading.index);
    }
  }
  return html;
}
function Council() {
  const members = getPages()
    .filter((p) => p.section === "team" && !p.isSection && p.slug.length === 2)
    .sort((a, b) => (a.weight || Infinity) - (b.weight || Infinity) || a.title.localeCompare(b.title));
  if (!members.length) return null;
  return (
    <section aria-labelledby="council-heading" style={{ marginTop: "3rem" }}>
      <h2 id="council-heading">Meet the Council Members</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "2rem", marginTop: "2rem" }}>
        {members.map((member) => {
          // Profile headings hold the role; fall back to the Doc's summary.
          const roleHtml = member.html.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1];
          const summary = member.description.replace(new RegExp(`^${member.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[,\\s:–—-]*`, "i"), "");
          return (
            <article key={member.path} style={{ textAlign: "center" }}>
              <Link href={href(member)} style={{ display: "block" }}>
                {member.thumb ? <img src={`${BASE}/${member.thumb.src}`} width={member.thumb.width} height={member.thumb.height} alt={member.title} loading="lazy" style={{ width: "160px", height: "160px", objectFit: "cover", borderRadius: "50%", margin: "0 auto 1rem" }} /> : <span aria-hidden="true" style={{ display: "block", width: "160px", height: "160px", borderRadius: "50%", background: "#eee", margin: "0 auto 1rem" }} />}
                <h3>{member.title}</h3>
              </Link>
              {roleHtml ? <p dangerouslySetInnerHTML={{ __html: roleHtml }} /> : summary && <p>{summary}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default async function ContentPage({ params }: Props) {
  const page = getPage((await params).slug);
  if (!page) notFound();
  const children = page.isSection ? getChildren(page) : [];
  const isPost = page.section === "posts";
  if (page.isSection && isPost) {
    return <>
      <PageHero page={page}><p className="eyebrow">Save the Date</p><h1>{page.title === "News" ? "News & Events" : page.title}</h1></PageHero>
      <section className="page-body"><div className="container">
        {page.html && <div className="content" dangerouslySetInnerHTML={{ __html: page.html }} />}
        <div className="cards">{children.map((c) => <Card key={c.path} page={c} />)}</div>
      </div></section>
    </>;
  }
  if (isPost) {
    const share = encodeURIComponent(page.permalink);
    return <>
      <PageHero page={page}>
        <p className="post-meta">{page.categories.map((c) => <span className="tag" key={c}>{c}</span>)}<span>{longDate(page.date)}</span></p>
        <h1>{page.title}</h1>{page.description && <p>{page.description}</p>}
      </PageHero>
      <section className="page-body"><div className={`container post-layout${page.cover ? "" : " no-cover"}`}>
        {page.cover && <div className="post-cover"><img src={`${BASE}/${page.cover.src}`} width={page.cover.width} height={page.cover.height} alt={page.title} /></div>}
        <div>
          {(page.eventDate || page.signup) && <div className="event-box">
            {page.eventDate && <p className="when"><span>When</span><strong>{page.eventDate}</strong></p>}
            {page.signup && <a className="button" href={page.signup} rel="noopener">Sign up</a>}
          </div>}
          <div className="content" dangerouslySetInnerHTML={{ __html: page.html }} />
          <div className="share"><span>Share</span>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${share}`} rel="noopener" target="_blank" aria-label="Share on Facebook"><Facebook /></a>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${share}`} rel="noopener" target="_blank" aria-label="Share on LinkedIn"><LinkedIn /></a>
          </div>
        </div>
      </div></section>
    </>;
  }
  if (page.section === "team" && !page.isSection) {
    const photo = page.thumb;
    const html = photo ? page.html.replace(/^<figure class="figure">[\s\S]*?<\/figure>/, "") : page.html;
    const about = getPage(["about-ambsaas"]);
    return <>
      <PageHero page={page}>
        <p className="eyebrow">{about ? <Link href={href(about)} style={{ color: "inherit", textDecoration: "none" }}>Council</Link> : "Council"}</p><h1>{page.title}</h1>
      </PageHero>
      <section className="page-body"><div className={`container ${photo ? "person" : ""}`}>
        {photo && <div className="person-photo"><img src={`${BASE}/${photo.src}`} width={photo.width} height={photo.height} alt={page.title} /></div>}
        <div className="content" dangerouslySetInnerHTML={{ __html: html }} />
      </div></section>
    </>;
  }
  const isAbout = page.path === "about-ambsaas";
  const body = isAbout ? withoutLegacyCouncil(page.html) : page.html;
  return <>
    <PageHero page={page} />
    <section className="page-body"><div className="container">
      {body.trim() && <div className="content" dangerouslySetInnerHTML={{ __html: body }} />}
      {isAbout && <Council />}
      {children.length > 0 && <div className="tiles subpages">{children.map((c) => <Tile key={c.path} page={c} />)}</div>}
    </div></section>
  </>;
}
