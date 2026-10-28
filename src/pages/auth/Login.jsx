import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Building2, ShieldCheck, Truck, UserCog, Eye, EyeOff, LogIn, User, Lock, Info } from 'lucide-react'
import logo from '@/assets/logo-hd.png'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABEL } from '@/lib/constants'
import { DEMO_ACCOUNTS } from '@/services/authService'
import { USE_MOCK } from '@/services/api'
import { cn } from '@/lib/utils'

const ICONS = { superadmin: ShieldCheck, admin: UserCog, driver: Truck, customer: Building2 }
const REMEMBER_KEY = 'tms_remember_username'
const ROUTE_PATH = 'M-50 700 C 250 650, 350 400, 640 450 S 1000 250, 1500 150'

// Hanya username yang diingat. Password tidak pernah disimpan.
const readRemembered = () => {
  try { return localStorage.getItem(REMEMBER_KEY) || '' } catch { return '' }
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const STYLES = `
@keyframes tms-rise { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
@keyframes tms-drift-a { 0%, 100% { transform: translate(0, 0) scale(1) } 50% { transform: translate(70px, 50px) scale(1.18) } }
@keyframes tms-drift-b { 0%, 100% { transform: translate(0, 0) scale(1) } 50% { transform: translate(-60px, -40px) scale(1.12) } }
@keyframes tms-flow { to { stroke-dashoffset: -120 } }
@keyframes tms-ping { 0% { transform: scale(0.6); opacity: 0.8 } 100% { transform: scale(2.8); opacity: 0 } }
@keyframes tms-twinkle { 0%, 100% { opacity: 0.15 } 50% { opacity: 1 } }
@keyframes tms-shine { from { transform: translateX(-120%) skewX(-20deg) } to { transform: translateX(320%) skewX(-20deg) } }
.tms-rise { animation: tms-rise 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both }
.tms-drift-a { animation: tms-drift-a 18s ease-in-out infinite }
.tms-drift-b { animation: tms-drift-b 22s ease-in-out infinite }
.tms-flow { animation: tms-flow 3.5s linear infinite }
.tms-ping { animation: tms-ping 2.6s ease-out infinite; transform-box: fill-box; transform-origin: center }
.tms-twinkle { animation: tms-twinkle 3.2s ease-in-out infinite }
.tms-btn:hover .tms-shine { animation: tms-shine 0.9s ease }
@media (prefers-reduced-motion: reduce) {
  .tms-rise, .tms-drift-a, .tms-drift-b, .tms-flow, .tms-ping, .tms-twinkle, .tms-btn:hover .tms-shine { animation: none !important }
}
`

/** Latar bergerak: grid, bintang berkedip, rute putus-putus mengalir, truk berjalan di sepanjang rute, penanda berdenyut. */
function Scene() {
  const still = prefersReducedMotion()
  const stars = [[120, 120], [300, 70], [520, 150], [760, 60], [980, 130], [1200, 80], [1350, 210], [90, 330], [430, 300], [880, 260], [1300, 400], [200, 820], [620, 780], [1100, 820], [1380, 700]]
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" fill="none" aria-hidden>
      <defs>
        <pattern id="ls-grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M60 0 H0 V60" stroke="#fff" strokeOpacity="0.045" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="1440" height="900" fill="url(#ls-grid)" />

      {stars.map(([x, y], i) => (
        <circle key={i} className="tms-twinkle" style={{ animationDelay: `${(i % 6) * 0.5}s` }} cx={x} cy={y} r={i % 3 === 0 ? 2.4 : 1.5} fill="#fff" />
      ))}

      {/* rute sekunder */}
      <path d="M-50 260 C 200 330, 420 180, 720 240 S 1120 520, 1500 470" stroke="#2fb0a8" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 12" strokeLinecap="round" className="tms-flow" />

      {/* rute utama */}
      <path d={ROUTE_PATH} stroke="#e5863c" strokeOpacity="0.25" strokeWidth="6" strokeLinecap="round" />
      <path d={ROUTE_PATH} stroke="#f0a267" strokeWidth="3" strokeDasharray="2 14" strokeLinecap="round" className="tms-flow" />

      {/* penanda */}
      {[[299, 538], [640, 450]].map(([x, y]) => (
        <g key={x}>
          <circle className="tms-ping" cx={x} cy={y} r="12" fill="#e5863c" />
          <circle cx={x} cy={y} r="9" fill="#12202e" stroke="#fff" strokeWidth="3" />
        </g>
      ))}
      <circle className="tms-ping" cx="991" cy="356" r="14" fill="#2fb0a8" />
      <rect x="980" y="345" width="22" height="22" rx="4" transform="rotate(45 991 356)" fill="#2fb0a8" stroke="#fff" strokeWidth="3" />

      {/* truk berjalan */}
      <g transform={still ? 'translate(300 540) scale(1.3)' : undefined}>
        {!still && <animateMotion dur="16s" repeatCount="indefinite" rotate="auto" path={ROUTE_PATH} />}
        <g transform="scale(1.3)">
          <path d="M39 6 L110 -8 L110 24 Z" fill="#fde68a" opacity="0.12" />
          <rect x="-34" y="-16" width="44" height="28" rx="4" fill="#fff" />
          <rect x="-34" y="2" width="44" height="5" fill="#e5863c" />
          <path d="M12 -8 H26 Q29 -8 31 -5 L38 4 V12 H12 Z" fill="#e5863c" />
          <path d="M16 -4 H25 L31 3 H16 Z" fill="#fbe3cf" />
          <circle cx="-20" cy="14" r="6.5" fill="#0a1520" stroke="#fff" strokeWidth="2" />
          <circle cx="26" cy="14" r="6.5" fill="#0a1520" stroke="#fff" strokeWidth="2" />
          <circle cx="39" cy="6" r="2" fill="#fde68a" />
        </g>
      </g>
    </svg>
  )
}

const fieldWrap = 'relative block'
const fieldInput = 'w-full rounded-xl border border-ink-600 bg-ink-800 py-3 pl-11 text-sm text-white outline-none transition placeholder:text-ink-300 focus:border-route-400 focus:bg-ink-700 focus:ring-4 focus:ring-route-500/25'
const fieldIcon = 'pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-route-400'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState(readRemembered)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => !!readRemembered())
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(() => {
    try { return sessionStorage.getItem('tms_session_expired') ? 'Sesi Anda berakhir. Silakan login kembali.' : '' } catch { return '' }
  })

  if (user) return <Navigate to={`/${user.role}/dashboard`} replace />

  const enter = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const signedIn = await login(username, password)
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, username.trim())
        else localStorage.removeItem(REMEMBER_KEY)
      } catch { /* abaikan */ }
      navigate(`/${signedIn.role}/dashboard`, { replace: true })
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa username dan password.')
    } finally {
      setBusy(false)
    }
  }

  const chooseDemo = (account) => {
    setUsername(account.username)
    setPassword(account.password)
    setError('')
    setNotice('')
  }

  const delay = (ms) => ({ animationDelay: `${ms}ms` })

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950 text-white">
      <style>{STYLES}</style>

      {/* latar bergerak */}
      <div className="tms-drift-a pointer-events-none absolute -left-32 -top-32 size-[34rem] rounded-full bg-route-500/30 blur-3xl" aria-hidden />
      <div className="tms-drift-b pointer-events-none absolute -bottom-40 right-0 size-[36rem] rounded-full bg-teal-500/20 blur-3xl" aria-hidden />
      <div className="tms-drift-b pointer-events-none absolute left-1/3 top-1/3 size-80 rounded-full bg-route-400/10 blur-3xl" aria-hidden />
      <Scene />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Hero (desktop) */}
        <div className="hidden lg:block">
          <div className="tms-rise" style={delay(0)}>
            <img src={logo} alt="Harrasima" width={512} height={494} className="size-24 object-contain drop-shadow-[0_0_24px_rgba(229,134,60,0.45)]" />
            <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-route-400 ring-1 ring-white/15">
              <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-route-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-route-400" /></span>
              Live tracking
            </span>
            <h1 className="mt-4 max-w-md text-4xl font-extrabold leading-tight">Tracking Management System</h1>
            <p className="mt-3 max-w-md text-ink-200">Setiap pengiriman terlihat dari gudang sampai tujuan.</p>
          </div>

          <div className="mt-10 max-w-md">
            {USE_MOCK && <p className="text-[11px] text-ink-400">Mode demo frontend · Data tersimpan di browser ini</p>}
          </div>
        </div>

        {/* Form */}
        <div className="mx-auto w-full max-w-md">
          <div className="tms-rise rounded-3xl border border-ink-700 bg-ink-900 p-6 shadow-2xl shadow-black/40 sm:p-8" style={delay(150)}>
            <div className="mb-6 text-center">
              <img src={logo} alt="Harrasima" width={512} height={494} className="mx-auto mb-4 size-16 object-contain lg:hidden" />
              <h2 className="text-xl font-extrabold uppercase tracking-[0.18em]">User Login</h2>
              <p className="mt-1 text-sm text-ink-300">Masuk dengan akun Anda. Dashboard menyesuaikan role akun.</p>
            </div>

            <form onSubmit={enter} className="space-y-3.5">
              <label className={cn(fieldWrap, 'tms-rise')} style={delay(300)}>
                <span className="sr-only">Username</span>
                <User className={fieldIcon} aria-hidden />
                <input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className={cn(fieldInput, 'pr-4')} />
              </label>
              <label className={cn(fieldWrap, 'tms-rise')} style={delay(400)}>
                <span className="sr-only">Password</span>
                <Lock className={fieldIcon} aria-hidden />
                <input autoComplete="current-password" required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={cn(fieldInput, 'pr-12')} />
                <button type="button" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-4 grid place-items-center text-ink-300 transition hover:text-white">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              </label>

              <div className="tms-rise flex items-center justify-between gap-3 text-xs" style={delay(500)}>
                <label className="flex cursor-pointer items-center gap-2 text-ink-200">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 rounded accent-route-500" />
                  Ingat username
                </label>
                <button type="button" onClick={() => setNotice('Reset password belum tersedia di mode demo. Hubungi administrator.')} className="font-semibold text-route-400 transition hover:text-route-100 hover:underline">Lupa password?</button>
              </div>

              {notice && <p className="flex items-start gap-2 rounded-xl bg-ink-800 px-3 py-2 text-xs text-ink-100" role="status"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />{notice}</p>}
              {error && <p className="rounded-xl bg-rose-950 px-3 py-2 text-sm text-rose-200 ring-1 ring-rose-400/40" role="alert">{error}</p>}

              <button type="submit" disabled={busy} style={delay(600)} className="tms-btn tms-rise relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-route-500 px-4 py-3 text-sm font-extrabold uppercase tracking-wider text-ink-950 shadow-lg shadow-route-500/30 transition hover:-translate-y-0.5 hover:bg-route-400 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
                <span className="tms-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-white/40" aria-hidden />
                <LogIn className="relative size-4" /><span className="relative">{busy ? 'Memeriksa akun...' : 'Login'}</span>
              </button>
            </form>

            {USE_MOCK && DEMO_ACCOUNTS.length > 0 && <section className="tms-rise mt-6 border-t border-ink-700 pt-5" style={delay(700)} aria-labelledby="demo-accounts-heading">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div><h3 id="demo-accounts-heading" className="text-sm font-bold">Akun demo</h3><p className="text-xs text-ink-300">Pilih role untuk mengisi kredensial otomatis.</p></div>
                <span className="rounded-full bg-amber-950 px-2.5 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/30">DUMMY</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((account) => {
                  const Icon = ICONS[account.role]
                  const selected = username === account.username
                  return (
                    <button key={account.role} type="button" onClick={() => chooseDemo(account)} className={cn('flex min-w-0 items-center gap-2.5 rounded-xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:border-route-400 hover:bg-ink-700', selected ? 'border-route-400 bg-ink-700 ring-1 ring-route-400/40' : 'border-ink-600 bg-ink-800')}>
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-route-500/20 text-route-400"><Icon className="size-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{ROLE_LABEL[account.role]}</span><span className="block truncate text-[11px] text-ink-300">{account.name}</span></span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-300">Password semua akun: <code className="rounded bg-ink-800 px-1.5 py-0.5 text-white">TMSdemo123!</code> · Autentikasi ini hanya simulasi frontend; produksi tetap perlu backend dan password yang di-hash.</p>
            </section>}

            <p className="mt-5 text-center text-xs text-ink-300">Belum punya akun? Hubungi administrator.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
