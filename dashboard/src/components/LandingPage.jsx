import { useState, useEffect, useRef } from 'react'

/* ── Animated counter ─────────────────────────────────────── */
function Counter({ target, suffix = '' }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const dur = 1200
        const tick = (now) => {
          const t = Math.min((now - start) / dur, 1)
          const ease = 1 - Math.pow(1 - t, 3)
          setVal(Math.round(target * ease))
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])

  return <span ref={ref}>{val}{suffix}</span>
}

const FEATURES = [
  {
    icon: '🅿',
    title: 'Gestion des places',
    desc: '45 places réparties en 3 zones (Standard, Mixte, VIP) avec attribution automatique et suivi en temps réel.',
    color: '#EA580C', bg: '#FFF7ED', bd: '#FDBA74',
    detail: '9 endpoints · schema places',
  },
  {
    icon: '↕',
    title: 'Entrées & Sorties',
    desc: 'Enregistrement instantané, facturation automatique au prorata et calcul du montant à la seconde près.',
    color: '#059669', bg: '#ECFDF5', bd: '#6EE7B7',
    detail: '10 endpoints · schema transactions',
  },
  {
    icon: '⚡',
    title: 'Alertes intelligentes',
    desc: 'Détection automatique des anomalies (taux critique > 90 %, dépassements horaires) avec notifications push.',
    color: '#DC2626', bg: '#FEF2F2', bd: '#FECACA',
    detail: 'Temps réel · résolution en 1 clic',
  },
  {
    icon: '📊',
    title: 'Statistiques & Reporting',
    desc: 'Revenus par zone et par type de véhicule, fréquentation horaire et export CSV téléchargeable.',
    color: '#0284C7', bg: '#F0F9FF', bd: '#BAE6FD',
    detail: '6 endpoints · export CSV',
  },
]

const STEPS = [
  { n: '01', title: 'Arrivée du véhicule', desc: 'L\'agent scanne la plaque. Le système attribue automatiquement la meilleure place disponible dans la zone souhaitée.', icon: '🚗', color: '#EA580C' },
  { n: '02', title: 'Stationnement en cours', desc: 'La place est verrouillée en temps réel. Le tableau de bord affiche le véhicule, la durée et le coût estimé croissant.', icon: '🅿', color: '#0284C7' },
  { n: '03', title: 'Sortie & facturation', desc: 'À la sortie, le système calcule la durée exacte, applique le tarif horaire et libère automatiquement la place.', icon: '✓', color: '#059669' },
]

const SERVICES = [
  { name: 'Places',       port: '8001', desc: '45 emplacements · 3 zones A/B/C · tarifs différenciés',     icon: '🅿', color: '#0284C7', endpoints: 9 },
  { name: 'Transactions', port: '8002', desc: 'Entrées, sorties, alertes, facturation FCFA',                icon: '↕',  color: '#6d28d9', endpoints: 10 },
  { name: 'Reporting',    port: '8003', desc: 'Revenus, statistiques, tendances horaires, export CSV',      icon: '∿',  color: '#EA580C', endpoints: 6 },
]

const STATS = [
  { n: 45,   suffix: '',   label: 'Places de parking' },
  { n: 3,    suffix: '',   label: 'Zones (A · B · C)' },
  { n: 25,   suffix: '+',  label: 'Endpoints REST' },
  { n: 5,    suffix: 's',  label: 'Rafraîchissement' },
]

export default function LandingPage({ onConnect }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ minHeight: '100vh', width: '100%', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: '#F3F1EC', color: '#1C1917' }}>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? 'rgba(19,15,13,0.97)' : '#130F0D',
        borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        transition: 'all 0.2s',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#EA580C,#F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', boxShadow: '0 3px 12px rgba(234,88,12,0.45)', letterSpacing: '-0.5px' }}>SP</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1 }}>SmartParking</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Dakar · SOA v2.0</div>
            </div>
          </div>

          {/* Nav links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hide-mobile">
            {[
              { label: 'Fonctionnalités', href: '#features' },
              { label: 'Comment ça marche', href: '#steps' },
              { label: 'Architecture', href: '#architecture' },
            ].map(l => (
              <a key={l.label} href={l.href} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500, textDecoration: 'none', transition: 'all 0.14s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = '' }}
              >{l.label}</a>
            ))}
          </nav>

          <button onClick={onConnect} style={{ padding: '9px 22px', borderRadius: 8, background: '#EA580C', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 12px rgba(234,88,12,0.4)', transition: 'all 0.15s', letterSpacing: '0.01em', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#C2410C'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(234,88,12,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#EA580C'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 3px 12px rgba(234,88,12,0.4)' }}
          >Connexion →</button>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(140deg,#0D0905 0%,#1C0A00 35%,#7C2D12 68%,#C2410C 100%)', padding: 'clamp(72px,11vw,120px) 24px clamp(64px,9vw,100px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -120, right: -120, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,88,12,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '10%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(234,88,12,0.04)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 820, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 24, background: 'rgba(234,88,12,0.15)', border: '1px solid rgba(234,88,12,0.3)', marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FB923C', display: 'inline-block', animation: 'live 2s ease-in-out infinite' }} className="animate-live" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#FB923C', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Plateforme IoT & SOA · Dakar, Sénégal · Examen 2026</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(36px,6.5vw,70px)', fontWeight: 800, color: '#fff', lineHeight: 1.06, letterSpacing: '-2.5px', margin: '0 0 24px' }}>
            Gestion intelligente<br />
            <span style={{ background: 'linear-gradient(90deg,#FB923C,#FCD34D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>des parkings urbains</span>
          </h1>

          {/* Sub */}
          <p style={{ fontSize: 'clamp(14px,2vw,18px)', color: 'rgba(255,255,255,0.52)', lineHeight: 1.8, margin: '0 auto 48px', maxWidth: 560 }}>
            Suivi temps réel · Facturation automatique · Alertes intelligentes<br />
            Architecture SOA avec 3 microservices FastAPI derrière une API Gateway Nginx.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
            <button onClick={onConnect} style={{ padding: '14px 32px', borderRadius: 10, background: 'linear-gradient(135deg,#EA580C,#C2410C)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 28px rgba(234,88,12,0.5)', transition: 'all 0.18s', letterSpacing: '0.01em' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(234,88,12,0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 28px rgba(234,88,12,0.5)' }}
            >Accéder au tableau de bord →</button>
            <a href="#features" style={{ padding: '14px 28px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.18s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)' }}
            >Découvrir les fonctionnalités</a>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {STATS.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#FB923C', fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>
                  <Counter target={s.n} suffix={s.suffix} />
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 500, lineHeight: 1.3 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accent gradient bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg,#EA580C,#F97316 35%,#FCD34D 65%,#0284C7)' }} />

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" style={{ padding: 'clamp(60px,8vw,96px) 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#EA580C', background: '#FFF7ED', border: '1px solid #FDBA74', padding: '4px 14px', borderRadius: 20, marginBottom: 16 }}>Fonctionnalités</div>
            <h2 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 800, color: '#1C1917', margin: '0 0 14px', letterSpacing: '-1px' }}>
              Tout pour opérer un parking moderne
            </h2>
            <p style={{ fontSize: 14, color: '#78716C', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              Chaque fonctionnalité est exposée via un contrat REST documenté Swagger et consommable indépendamment.
            </p>
          </div>

          <div className="g-2" style={{ gap: 18 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title}
                style={{ padding: '28px 28px 24px', borderRadius: 12, background: '#fff', border: '1px solid #E2DDD3', borderLeft: `3px solid ${f.color}`, position: 'relative', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(28,25,23,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
              >
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: f.bg, opacity: 0.6, pointerEvents: 'none' }} />
                <div style={{ width: 50, height: 50, borderRadius: 13, background: f.bg, border: `1.5px solid ${f.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 20, position: 'relative' }}>
                  {f.icon}
                </div>
                <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: '#1C1917', letterSpacing: '-0.3px' }}>{f.title}</h3>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#78716C', lineHeight: 1.7 }}>{f.desc}</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: f.color, background: f.bg, border: `1px solid ${f.bd}`, padding: '3px 10px', borderRadius: 6 }}>
                  {f.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section id="steps" style={{ padding: 'clamp(56px,8vw,88px) 24px', background: '#fff', borderTop: '1px solid #E2DDD3', borderBottom: '1px solid #E2DDD3' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#0284C7', background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '4px 14px', borderRadius: 20, marginBottom: 16 }}>Comment ça marche</div>
            <h2 style={{ fontSize: 'clamp(22px,3.5vw,34px)', fontWeight: 800, color: '#1C1917', margin: 0, letterSpacing: '-0.7px' }}>
              De l'entrée à la sortie, en 3 étapes
            </h2>
          </div>

          <div className="g-3" style={{ gap: 20, position: 'relative' }}>
            {STEPS.map((step, i) => (
              <div key={step.n} style={{ position: 'relative' }}>
                {/* Connector line (hidden on mobile via inline check) */}
                {i < STEPS.length - 1 && (
                  <div className="hide-mobile" style={{ position: 'absolute', top: 32, left: 'calc(100% + 10px)', width: 'calc(100% - 20px)', height: 2, background: `linear-gradient(90deg, ${step.color}, ${STEPS[i+1].color})`, opacity: 0.25, zIndex: 0 }} />
                )}
                <div style={{ padding: '28px 24px 24px', borderRadius: 14, background: '#FAFAFA', border: '1px solid #E2DDD3', position: 'relative', zIndex: 1, transition: 'box-shadow 0.2s, transform 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 28px ${step.color}18`; e.currentTarget.style.transform = 'translateY(-3px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 11, background: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, boxShadow: `0 4px 14px ${step.color}40` }}>
                      {step.icon}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: step.color, fontFamily: "'Space Mono', monospace", opacity: 0.25, letterSpacing: '-1px', lineHeight: 1 }}>{step.n}</div>
                  </div>
                  <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1C1917', letterSpacing: '-0.2px' }}>{step.title}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#78716C', lineHeight: 1.7 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture ────────────────────────────────────── */}
      <section id="architecture" style={{ padding: 'clamp(56px,8vw,88px) 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
            <div style={{ maxWidth: 480 }}>
              <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#EA580C', background: '#FFF7ED', border: '1px solid #FDBA74', padding: '4px 14px', borderRadius: 20, marginBottom: 16 }}>Architecture SOA</div>
              <h2 style={{ fontSize: 'clamp(22px,3.5vw,34px)', fontWeight: 800, color: '#1C1917', margin: '0 0 16px', letterSpacing: '-0.7px' }}>
                3 microservices indépendants
              </h2>
              <p style={{ fontSize: 13, color: '#78716C', lineHeight: 1.75, margin: 0 }}>
                Chaque service tourne dans son propre conteneur Docker, possède son schéma PostgreSQL isolé et expose une documentation Swagger complète. La communication se fait exclusivement via HTTP REST à travers l'API Gateway Nginx.
              </p>
            </div>
            {/* Principle tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 380 }}>
              {['Couplage faible', 'Contrats OpenAPI', 'Schémas isolés', 'Registre SOA', 'Stateless', 'Autonomie Docker', 'Composition'].map(p => (
                <span key={p} style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: '#FAF8F3', border: '1px solid #E2DDD3', color: '#44403C' }}>{p}</span>
              ))}
            </div>
          </div>

          {/* Service cards */}
          <div className="g-3" style={{ gap: 16, marginBottom: 16 }}>
            {SERVICES.map(s => (
              <div key={s.name} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #E2DDD3', transition: 'transform 0.18s, box-shadow 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(28,25,23,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
              >
                <div style={{ background: s.color, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#fff', flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Service {s.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: "'Space Mono', monospace" }}>:{s.port} · {s.endpoints} endpoints</div>
                  </div>
                </div>
                <div style={{ padding: '14px 18px', background: '#FAFAFA' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#78716C', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Gateway bar */}
          <div style={{ padding: '14px 22px', borderRadius: 12, background: '#130F0D', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span className="animate-live" style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', fontFamily: "'Space Mono', monospace" }}>Nginx API Gateway</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>→ port 8090 · /api/places/ · /api/transactions/ · /api/reporting/ · /api/registry</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#FB923C', background: 'rgba(234,88,12,0.15)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(234,88,12,0.28)', flexShrink: 0 }}>v2.0.0</span>
          </div>

          {/* Docker stack badges */}
          <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 4 }}>Stack :</span>
            {[['Python 3.12 + FastAPI', '#3776AB'], ['PostgreSQL 16', '#336791'], ['Nginx', '#009639'], ['React 18 + Vite', '#646CFF'], ['Docker Compose', '#2496ED'], ['PHP 8.3 Simulateur', '#777BB4']].map(([t, c]) => (
              <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: c + '12', color: c, border: `1px solid ${c}28` }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────── */}
      <section style={{ padding: 'clamp(64px,8vw,100px) 24px', background: 'linear-gradient(135deg,#0D0905 0%,#1C0A00 40%,#7C2D12 80%,#EA580C 100%)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, borderRadius: '50%', background: 'rgba(234,88,12,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 580, margin: '0 auto' }}>
          <div style={{ fontSize: 36, marginBottom: 20 }}>🅿</div>
          <h2 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: '-1px' }}>
            Prêt à gérer votre parking ?
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', margin: '0 0 36px', lineHeight: 1.75 }}>
            Accédez au tableau de bord en temps réel. Trois comptes disponibles : administrateur, agent ou visiteur démo.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onConnect} style={{ padding: '14px 36px', borderRadius: 10, background: '#EA580C', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 28px rgba(234,88,12,0.5)', transition: 'all 0.18s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#C2410C'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#EA580C'; e.currentTarget.style.transform = '' }}
            >Se connecter →</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} className="animate-live" />
              Simulateur actif · données en direct
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer style={{ background: '#0D0905', padding: '32px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#EA580C,#F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>SP</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>SmartParking Dakar</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Projet SOA · Master 1 SI/SR · UADB SATIC · 2026</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {['Python FastAPI', 'React 18', 'PostgreSQL', 'Nginx', 'Docker'].map(t => (
              <span key={t} style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontWeight: 500 }}>{t}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
