"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./TeamCarousel.module.css";

type Member = { path: string; title: string; roleHtml: string; description: string; photo: { src: string; width: number; height: number } | null };

export default function TeamCarouselClient({ members, base }: { members: Member[]; base: string }) {
  const pathname = usePathname() ?? "";
  const track = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  let current = pathname.replace(/\/$/, "");
  if (base && (current === base || current.startsWith(`${base}/`))) current = current.slice(base.length);
  const isProfile = members.some((member) => member.path === current);
  useEffect(() => { setReady(true); }, []);
  useEffect(() => { track.current?.scrollTo({ left: 0, behavior: "auto" }); }, [pathname]);
  if (!isProfile || !members.length) return null;

  function move(direction: number) {
    const element = track.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    const atEnd = direction > 0 && element.scrollLeft >= max - 2;
    const atStart = direction < 0 && element.scrollLeft <= 2;
    const left = atEnd ? 0 : atStart ? max : Math.max(0, Math.min(max, element.scrollLeft + direction * element.clientWidth));
    element.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  return (
    <div className="container">
      <section className={styles.carousel} aria-labelledby="team-carousel-heading" aria-roledescription="carousel">
        <div className={styles.header}>
          <h2 id="team-carousel-heading">Meet the team</h2>
          <div className={styles.controls} hidden={!ready}>
            <button type="button" onClick={() => move(-1)} aria-label="Previous team members" aria-controls="team-carousel-track">&#8592;</button>
            <button type="button" onClick={() => move(1)} aria-label="Next team members" aria-controls="team-carousel-track">&#8594;</button>
          </div>
        </div>
        <p id="team-carousel-help">Browse the council and select a member to read their profile.</p>
        <div id="team-carousel-track" className={styles.track} ref={track} tabIndex={0} role="group" aria-label="Team member profiles" aria-describedby="team-carousel-help" onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); }
        }}>
          {members.map((member) => (
            <Link key={member.path} className={styles.card} href={`${member.path}/`} aria-current={member.path === current ? "page" : undefined}>
              {member.photo ? <img src={member.photo.src} width={member.photo.width} height={member.photo.height} alt="" loading="lazy" /> : <span className={styles.placeholder} aria-hidden="true" />}
              <h3>{member.title}</h3>
              {member.roleHtml ? <p dangerouslySetInnerHTML={{ __html: member.roleHtml }} /> : member.description && <p>{member.description}</p>}
              {member.path === current && <small>Current profile</small>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
