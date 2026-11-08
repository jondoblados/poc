// Small inline icons (no icon font needed)
const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const Caret = () => (
  <svg className="caret" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
);
export const MenuIcon = ({ open }: { open: boolean }) => (
  <svg {...svg} width="26" height="26">{open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
);
export const LinkedIn = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.5c0-1.3-.02-3-1.83-3-1.84 0-2.12 1.43-2.12 2.9V21H9z" /></svg>
);
export const Facebook = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.87.25-1.46 1.5-1.46h1.6V4.46A21 21 0 0014.3 4.3c-2.3 0-3.8 1.4-3.8 3.95v2.25H8v3h2.5V21z" /></svg>
);
export const Mail = () => (
  <svg {...svg}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);
export const Network = () => (
  <svg {...svg}><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="18" r="2.5" /><circle cx="19" cy="18" r="2.5" /><path d="M12 7.5v4M12 11.5l-5.2 4.6M12 11.5l5.2 4.6" /></svg>
);
export const Handshake = () => (
  <svg {...svg}><path d="M11 17l2 2a1.5 1.5 0 002.1-2.1" /><path d="M14 14l2.5 2.5a1.5 1.5 0 002.1-2.1L15 10.8" /><path d="M2 11l4.5-4.5L11 8l-3 3a1.5 1.5 0 002.1 2.1L13 10l6 6" /><path d="M22 11l-4.5-4.5L13 8" /></svg>
);
export const Growth = () => (
  <svg {...svg}><path d="M3 20h18" /><path d="M5 16l5-5 3 3 6-7" /><path d="M14 7h5v5" /></svg>
);
