// Soft wave divider, as used between bands on mbsaas.org. `color` = colour of the area below the wave.
export default function Wave({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg className={`wave ${className}`} viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true" style={flip ? { transform: "scaleY(-1)" } : undefined}>
      <path d="M0 52c160-34 340-46 520-20s330 52 520 34 270-42 400-46v70H0z" fill="currentColor" opacity=".55" />
      <path d="M0 66c210-30 410-30 600-6s360 36 540 18 220-30 300-34v46H0z" fill="currentColor" />
    </svg>
  );
}
