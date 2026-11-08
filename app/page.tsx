import Card, { Tile } from "./components/Card";
import Wave from "./components/Wave";
import { Growth, Handshake, Network } from "./components/icons";
import { getPages, getPosts, BASE } from "@/lib/content";
import { getHome, type Button } from "@/lib/home";

// Home page layout follows mbsaas.org. The words, buttons and mission photos come from the "Home" Doc
// (lib/home.ts); news cards and section tiles come from the other Docs. Layout and styling stay in code.
const ICONS = [Network, Handshake, Growth];

function Btn({ b, className = "button" }: { b?: Button; className?: string }) {
  if (!b) return null;
  const external = /^https?:/.test(b.href) && !b.href.includes("jon.doblados.net/ambsaas");
  return (
    <a className={className} href={b.href} {...(external ? { target: "_blank", rel: "noopener" } : {})}>
      {b.text}
    </a>
  );
}

function Head({ label, heading }: { label: string; heading: string }) {
  return (
    <div className="section-head">
      {label && <p className="eyebrow">{label}</p>}
      <h2>{heading}</h2>
    </div>
  );
}

export default function Home() {
  const h = getHome();
  const posts = getPosts().slice(0, h.news.count);
  const sections = getPages().filter((p) => p.menu && !p.menu.parent && p.slug.length === 1 && p.section !== "posts");
  const photos = h.mission.photos.length === 2
    ? h.mission.photos
    : getPages().filter((p) => p.section === "events" && !p.isSection && p.thumb).slice(0, 2).map((p) => p.thumb!);
  return (
    <>
      <section className="hero">
        <div className="container">
          {h.banner.label && <p className="eyebrow">{h.banner.label}</p>}
          <h1>{h.banner.heading}</h1>
          {h.banner.button && <p><Btn b={h.banner.button} /></p>}
        </div>
        <Wave />
      </section>

      <section className="newsletter">
        <div className="container">
          <h2>{h.follow.heading}</h2>
          <Btn b={h.follow.button} className="button button-sm" />
        </div>
      </section>

      <section className="section">
        <div className="container mission">
          <div>
            {h.mission.label && <p className="eyebrow">{h.mission.label}</p>}
            <h2>{h.mission.heading}</h2>
            <div dangerouslySetInnerHTML={{ __html: h.mission.html }} />
            {h.mission.button && <p><Btn b={h.mission.button} className="button button-outline" /></p>}
          </div>
          {photos.length === 2 && (
            <div className="mission-art" aria-hidden="true">
              {photos.map((p) => <img key={p.src} src={`${BASE}/${p.src}`} alt="" loading="lazy" />)}
            </div>
          )}
        </div>
      </section>

      <section className="section section-band">
        <div className="container">
          <Head {...h.values} />
          <div className="values">
            {h.values.items.map((v, i) => {
              const Icon = ICONS[i % ICONS.length];
              return (
                <div key={v.title}>
                  <div className="value-icon"><Icon /></div>
                  <h3>{v.title}</h3>
                  {v.text && <p>{v.text}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Head {...h.news} />
          {posts.length ? (
            <div className="cards">{posts.map((p) => <Card key={p.path} page={p} />)}</div>
          ) : (
            <p style={{ textAlign: "center" }}>No posts yet. Move a Doc into LIVE &gt; Posts.</p>
          )}
          {h.news.button && <p style={{ textAlign: "center", marginTop: 36 }}><Btn b={h.news.button} /></p>}
        </div>
      </section>

      <section className="section section-band">
        <div className="container">
          <Head {...h.explore} />
          <div className="tiles tiles-2">{sections.map((p) => <Tile key={p.path} page={p} />)}</div>
        </div>
      </section>

      <section className="newsletter plain">
        <div className="container">
          <h2>{h.join.heading}</h2>
          <Btn b={h.join.button} />
        </div>
      </section>
    </>
  );
}
