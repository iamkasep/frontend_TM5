const ROUTE = 'M0 220 C 120 210, 150 120, 280 130 S 450 60, 640 40'
const STARS = [[60, 40], [200, 70], [330, 30], [470, 150], [560, 90], [90, 160], [610, 200]]

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Hiasan rute bergerak di sisi kanan banner (selaras dengan halaman login). */
function HeroArt() {
  const still = prefersReducedMotion()
  return (
    <svg viewBox="0 0 640 260" preserveAspectRatio="xMaxYMid slice" className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-3/5 md:block" fill="none" aria-hidden>
      <defs>
        <pattern id="dh-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0 H0 V40" stroke="#fff" strokeOpacity="0.05" />
        </pattern>
      </defs>
      <rect width="640" height="260" fill="url(#dh-grid)" />
      {STARS.map(([x, y], i) => <circle key={i} className="dash-twinkle" style={{ animationDelay: `${i * 0.45}s` }} cx={x} cy={y} r={i % 2 ? 1.4 : 2.2} fill="#fff" />)}
      <path d={ROUTE} stroke="#e5863c" strokeOpacity="0.25" strokeWidth="6" strokeLinecap="round" />
      <path d={ROUTE} stroke="#f0a267" strokeWidth="3" strokeDasharray="2 14" strokeLinecap="round" className="dash-flow" />
      <circle cx="136" cy="168" r="8" fill="#12202e" stroke="#fff" strokeWidth="3" />
      <circle cx="280" cy="130" r="8" fill="#12202e" stroke="#fff" strokeWidth="3" />
      <rect x="427" y="86" width="20" height="20" rx="4" transform="rotate(45 437 96)" fill="#2fb0a8" stroke="#fff" strokeWidth="3" />
      <circle r="7" cx={still ? 136 : 0} cy={still ? 168 : 0} fill="#e5863c" stroke="#fff" strokeWidth="3">
        {!still && <animateMotion dur="9s" repeatCount="indefinite" path={ROUTE} />}
      </circle>
    </svg>
  )
}

/**
 * Banner pembuka dashboard: latar navy dengan gradasi dan hiasan rute seperti halaman login.
 * children = konten tambahan di bawah teks (mis. form lacak resi).
 */
export default function DashboardHero({ eyebrow, title, description, actions, children }) {
  return (
    <section className="dash-rise relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 p-6 text-white shadow-lg shadow-ink-900/20 sm:p-8">
      <div className="dash-drift pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-route-500/25 blur-3xl" aria-hidden />
      <div className="dash-drift pointer-events-none absolute -bottom-28 right-10 size-72 rounded-full bg-teal-500/15 blur-3xl" aria-hidden />
      <HeroArt />
      <div className="relative max-w-xl">
        {eyebrow && (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-route-400 ring-1 ring-white/15">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-route-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-route-400" /></span>
            {eyebrow}
          </span>
        )}
        <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-ink-200 sm:text-base">{description}</p>}
        {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  )
}
