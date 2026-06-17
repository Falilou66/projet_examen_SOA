import { useState } from 'react'
import { auth as authApi } from '../services/api'

const INITIALS = { admin: 'AD', agent: 'AG', demo: 'DM', viewer: 'DM' }

const DEMO_ACCOUNTS = [
  { u: 'admin', p: 'admin2026', r: 'Administrateur', color: '#EA580C', badge: 'ADMIN', desc: 'Accès complet' },
  { u: 'agent', p: 'agent2026', r: 'Agent parking',  color: '#059669', badge: 'AGENT', desc: 'Opérations parking' },
  { u: 'demo',  p: 'demo',      r: 'Visiteur',       color: '#0284C7', badge: 'DEMO',  desc: 'Lecture seule' },
]

export default function LoginPage({ onLogin, onBack }) {
  const [form, setForm]       = useState({ username: '', password: '' })
  const [err, setErr]         = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [focused, setFocused] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setErr(null)
    if (!form.username.trim() || !form.password) { setErr('Veuillez remplir tous les champs'); return }
    setLoading(true)
    try {
      const res = await authApi.login(form.username.trim().toLowerCase(), form.password)
      if (!res?.success) {
        setErr(res?.error || 'Identifiant ou mot de passe incorrect')
        setLoading(false)
        return
      }
      const { token, username, name, role, permissions } = res.data
      localStorage.setItem('sp_jwt', token)
      onLogin({
        username,
        name,
        role,
        permissions,
        initials: INITIALS[username] || username.slice(0, 2).toUpperCase(),
      })
    } catch {
      setErr('Service d\'authentification indisponible')
      setLoading(false)
    }
  }

  const fillDemo = (acc) => {
    setForm({ username: acc.u, password: acc.p })
    setErr(null)
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', background: '#F3F1EC', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* ── Left panel (brand) ─────────────────────────────── */}
      <div className="hide-mobile" style={{ width: '45%', maxWidth: 560, background: 'linear-gradient(145deg,#0D0905 0%,#1C0A00 40%,#7C2D12 80%,#C2410C 100%)', display: 'flex', flexDirection: 'column', padding: '48px 48px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {/* BG decorations */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 380, height: 380, borderRadius: '50%', background: 'rgba(234,88,12,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        {/* Logo + back */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginBottom: 'auto' }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#EA580C,#F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', boxShadow: '0 4px 14px rgba(234,88,12,0.5)' }}>SP</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' }}>SmartParking</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Dakar · SOA v2.0</div>
            </div>
          </button>
          <button onClick={onBack} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', transition: 'all 0.14s', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
          >← Accueil</button>
        </div>

        {/* Main brand content */}
        <div style={{ position: 'relative', marginTop: 48, marginBottom: 'auto' }}>
          <div style={{ fontSize: 48, marginBottom: 24, lineHeight: 1 }}>🅿</div>
          <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.8px', lineHeight: 1.15 }}>
            Tableau de bord<br />
            <span style={{ color: '#FB923C' }}>opérateur parking</span>
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, margin: '0 0 36px', maxWidth: 340 }}>
            Gérez en temps réel les 45 places réparties en 3 zones, suivez les véhicules stationnés et consultez les statistiques.
          </p>

          {/* Feature list */}
          {[
            { icon: '⏱', text: 'Synchronisation toutes les 5 secondes' },
            { icon: '⚡', text: 'Alertes automatiques en cas d\'anomalie' },
            { icon: '📊', text: 'Statistiques et export CSV intégrés' },
            { icon: '🔒', text: '3 niveaux d\'accès (admin / agent / visiteur)' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{f.icon}</div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Bottom: arch info */}
        <div style={{ position: 'relative', padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', marginTop: 32 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Architecture</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['FastAPI :8001', 'FastAPI :8002', 'FastAPI :8003', 'Nginx :8090', 'PostgreSQL :5432', 'React :3001'].map(t => (
              <span key={t} style={{ fontSize: 9, fontWeight: 600, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ─────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px,4vw,48px)', overflowY: 'auto' }}>

        {/* Mobile header */}
        <div style={{ width: '100%', maxWidth: 400, display: 'none' }} className="show-mobile-flex">
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 24px', fontFamily: 'inherit' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>SP</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1917' }}>SmartParking</span>
          </button>
        </div>

        <div style={{ width: '100%', maxWidth: 400 }} className="animate-fadeup">

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#1C1917', letterSpacing: '-0.5px' }}>Connexion</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#A8A29E' }}>Accédez au tableau de bord opérateur</p>
          </div>

          {/* Form card */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2DDD3', boxShadow: '0 4px 24px rgba(28,25,23,0.08)', overflow: 'hidden' }}>
            <form onSubmit={submit} style={{ padding: '28px 28px 24px' }}>

              {/* Username */}
              <div style={{ marginBottom: 16 }}>
                <label className="sp-label">Identifiant</label>
                <input
                  className="sp-input"
                  type="text"
                  placeholder="admin, agent ou demo"
                  value={form.username}
                  onChange={e => { setForm(f => ({ ...f, username: e.target.value })); setErr(null) }}
                  onFocus={() => setFocused('user')}
                  onBlur={() => setFocused(null)}
                  autoFocus
                  autoComplete="username"
                  style={{ background: focused === 'user' ? '#FFFBF8' : '#fff' }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 22 }}>
                <label className="sp-label">Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="sp-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErr(null) }}
                    onFocus={() => setFocused('pw')}
                    onBlur={() => setFocused(null)}
                    autoComplete="current-password"
                    style={{ paddingRight: 44, background: focused === 'pw' ? '#FFFBF8' : '#fff' }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#A8A29E', padding: 4, lineHeight: 1, transition: 'color 0.14s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#78716C' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#A8A29E' }}
                  >{showPw ? '🙈' : '👁'}</button>
                </div>
              </div>

              {/* Error */}
              {err && (
                <div className="animate-fadeup" style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 18, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flexShrink: 0 }}>⚠</span> {err}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} className="sp-btn sp-btn-primary" style={{ width: '100%', padding: '13px', fontSize: 14, borderRadius: 10, opacity: loading ? 0.75 : 1, gap: 8, letterSpacing: '0.01em' }}>
                {loading
                  ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Connexion en cours…</>
                  : '→ Se connecter'
                }
              </button>
            </form>

            {/* Demo accounts */}
            <div style={{ borderTop: '1px solid #F0EDE8', padding: '18px 28px 22px', background: '#FAFAF8' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Comptes de démonstration — cliquer pour remplir
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {DEMO_ACCOUNTS.map(c => (
                  <button key={c.u} type="button" onClick={() => fillDemo(c)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 11px', borderRadius: 8, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', fontSize: 12, transition: 'all 0.13s', fontFamily: 'inherit', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F3F1EC'; e.currentTarget.style.borderColor = '#E2DDD3' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0, letterSpacing: '-0.5px' }}>{c.badge.slice(0,2)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#1C1917', fontSize: 11 }}>{c.u}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: c.color + '15', color: c.color, border: `1px solid ${c.color}30` }}>{c.badge}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#A8A29E', marginTop: 1 }}>{c.desc}</div>
                    </div>
                    <span style={{ fontSize: 10, color: '#D6D3D1', flexShrink: 0 }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Back link */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button onClick={onBack} style={{ fontSize: 12, color: '#A8A29E', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.14s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#44403C' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#A8A29E' }}
            >← Retour à l'accueil</button>
          </div>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 10, color: '#D6D3D1' }}>
            SmartParking Dakar · SOA Platform v2.0 · Examen Master 1 SI/SR · UADB SATIC 2026
          </div>
        </div>
      </div>
    </div>
  )
}
