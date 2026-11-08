import Link from "next/link";
import Card, { href, Tile } from "./components/Card";
import Wave from "./components/Wave";
import { Growth, Handshake, Network } from "./components/icons";
import { getPage, getPages, getPosts, BASE } from "@/lib/content";

// Home page layout follows mbsaas.org. Sections show content from the Docs where it exists
// (news posts, About, section pages); the hero and values are fixed site copy.
export default function Home() {
  const posts = getPosts().slice(0, 6);
  const about = getPage(["about-ambsaas"]);
  const membership = getPage(["membership"]);
  const contact = getPage(["contact-us"]);
  const sections = getPages().filter((p) => p.menu && !p.menu.parent && p.slug.length === 1 && p.section !== "posts");
  const aboutPhotos = getPages().filter((p) => p.section === "events" && !p.isSection && p.thumb).slice(0, 2);
  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">AMBSAAS</p>
          <h1>Power Your Network for Your Future.</h1>
          <p>
            <Link className="button" href={membership ? href(membership) : "/"}>Join Us</Link>
          </p>
        </div>
        <Wave />
      </section>

      <section className="newsletter">
        <div className="container">
          <h2>Stay connected. Follow AMBSAAS for news and events!</h2>
          <a className="button button-sm" href="https://www.linkedin.com/company/mbsaas/" rel="noopener" target="_blank">Follow on LinkedIn</a>
        </div>
      </section>

      {about && (
        <section className="section">
          <div className="container mission">
            <div>
              <p className="eyebrow">OUR MISSION</p>
              <h2>The Alliance Manchester Business School Alumni Association of Singapore</h2>
              <p>
                The Alliance Manchester Business School Alumni Association of Singapore, AMBSAAS, aims to support lifelong
                relationships between the alumni and our alma mater.
              </p>
              <p>
                AMBSAAS is about the leverage of network: professional networking, entrepreneurial advisory and more,
                and giving back to the community through initiatives such as the Manchester Day of Action.
              </p>
              <p><Link className="button button-outline" href={href(about)}>About AMBSAAS</Link></p>
            </div>
            {aboutPhotos.length === 2 && (
              <div className="mission-art" aria-hidden="true">
                {aboutPhotos.map((p) => <img key={p.path} src={`${BASE}/${p.thumb!.src}`} alt="" loading="lazy" />)}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section section-band">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">OUR VALUES</p>
            <h2>Connect, collaborate and grow with AMBS alumni</h2>
          </div>
          <div className="values">
            <div><div className="value-icon"><Network /></div><h3>Connect</h3><p>To channel the alumni into a vibrant network of high-potential people</p></div>
            <div><div className="value-icon"><Handshake /></div><h3>Collaborate</h3><p>A platform for ideation and joint opportunities</p></div>
            <div><div className="value-icon"><Growth /></div><h3>Commerce</h3><p>Enabling and supporting the success of business-minded individuals in our network</p></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Save the Date</p>
            <h2>Latest News &amp; Events</h2>
          </div>
          {posts.length ? (
            <div className="cards">{posts.map((p) => <Card key={p.path} page={p} />)}</div>
          ) : (
            <p style={{ textAlign: "center" }}>No posts yet. Move a Doc into LIVE &gt; Posts.</p>
          )}
          <p style={{ textAlign: "center", marginTop: 36 }}><Link className="button" href="/posts/">All news</Link></p>
        </div>
      </section>

      <section className="section section-band">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Explore</p>
            <h2>As an AMBS alumnus, you are supported.</h2>
          </div>
          <div className="tiles tiles-2">{sections.map((p) => <Tile key={p.path} page={p} />)}</div>
        </div>
      </section>

      {contact && (
        <section className="newsletter plain">
          <div className="container">
            <h2>Be part of the AMBSAAS Community today!</h2>
            <Link className="button" href={href(contact)}>Contact Us</Link>
          </div>
        </section>
      )}
    </>
  );
}
