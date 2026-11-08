import Link from "next/link";
export default function NotFound() {
  return (
    <article className="post">
      <h1>Page not found</h1>
      <p>This page may have been moved out of the LIVE folder. <Link href="/">Go to the home page</Link>.</p>
    </article>
  );
}
