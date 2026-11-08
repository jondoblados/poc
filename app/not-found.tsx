import Link from "next/link";
import Wave from "./components/Wave";
export default function NotFound() {
  return (
    <section className="page-hero">
      <div className="container" style={{ paddingBottom: 48 }}>
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>This page may have been moved out of the LIVE folder.</p>
        <p><Link className="button" href="/">Go to the home page</Link></p>
      </div>
      <Wave />
    </section>
  );
}
