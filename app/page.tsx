import Card from "./components/Card";
import { getPosts } from "@/lib/content";

export default function Home() {
  const posts = getPosts().slice(0, 12);
  return (
    <>
      <section className="hero">
        <h1>Alliance Manchester Business School Alumni Association of Singapore</h1>
        <p>
          This is proof of concept 2. Every page was written in Google Docs and published automatically; the website
          itself is a Next.js (React) application exported as static files.
        </p>
      </section>
      <h2>Latest news &amp; events</h2>
      <div className="grid">
        {posts.length ? posts.map((p) => <Card key={p.path} page={p} />) : <p>No posts yet. Move a Doc into LIVE &gt; Posts.</p>}
      </div>
    </>
  );
}
