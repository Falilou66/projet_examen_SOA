import { useState, useEffect, useRef, useCallback } from 'react'
import Dashboard          from './components/Dashboard.jsx'
import VueParkingGrille  from './components/VueParkingGrille.jsx'
import ListeVehicules    from './components/ListeVehicules.jsx'
import AlertesPanel      from './components/AlertesPanel.jsx'
import StatistiquesParking from './components/StatistiquesParking.jsx'
import RegistreServices  from './components/RegistreServices.jsx'
import ArchitecturePage  from './components/ArchitecturePage.jsx'
import LandingPage       from './components/LandingPage.jsx'
import LoginPage         from './components/LoginPage.jsx'
import { places, transactions } from './services/api.js'
import './App.css'

let _tid = 0

/* ── Toast ─────────────────────────────────────────────────── */
function Toast({ toast }) {
  const s = {
    danger:  { bg: '#FEF2F2', bd: '#FECACA', c: '#991B1B', icon: '⚡' },
    success: { bg: '#ECFDF5', bd: '#6EE7B7', c: '#065F46', icon: '✓'  },
    info:    { bg: '#FFFFFF', bd: '#E2DDD3', c: '#44403C', icon: 'ℹ'  },
  }[toast.type] ?? { bg: '#FFFFFF', bd: '#E2DDD3', c: '#44403C', icon: 'ℹ' }
  return (
    <div className="animate-slidein" style={{
      background: s.bg, border: `1px solid ${s.bd}`,
      borderRadius: 10, padding: '12px 16px',
      color: s.c, fontSize: 13, fontWeight: 500, maxWidth: 320,
      boxShadow: '0 8px 32px rgba(28,25,23,0.12), 0 2px 8px rgba(28,25,23,0.06)',
      lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <span>{toast.msg}</span>
    </div>
  )
}

function ToastStack({ toasts }) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 999 }}>
      {toasts.map(t => <Toast key={t.id} toast={t} />)}
    </div>
  )
}

/* ── SVG Icons ───────────────────────────────────────────────── */
function IconGrid({ size=16, color='currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" stroke={color} strokeWidth="1.4"/>
    <rect x="9.5" y="1" width="5.5" height="5.5" rx="1.5" stroke={color} strokeWidth="1.4"/>
    <rect x="1" y="9.5" width="5.5" height="5.5" rx="1.5" stroke={color} strokeWidth="1.4"/>
    <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1.5" stroke={color} strokeWidth="1.4"/>
  </svg>
}
function IconPark({ size=16, color='currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" stroke={color} strokeWidth="1.4"/>
    <path d="M5.5 11.5V4.5h3a2.5 2.5 0 010 5H5.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
}
function IconCar({ size=16, color='currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2.5 8.5l1.2-3.5h8.6l1.2 3.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    <rect x="1.5" y="8.5" width="13" height="4" rx="1.5" stroke={color} strokeWidth="1.4"/>
    <circle cx="4.5" cy="12.5" r="1" fill={color}/>
    <circle cx="11.5" cy="12.5" r="1" fill={color}/>
  </svg>
}
function IconBell({ size=16, color='currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 2a4.5 4.5 0 014.5 4.5c0 2.5.5 4 1.5 5H2c1-1 1.5-2.5 1.5-5A4.5 4.5 0 018 2z" stroke={color} strokeWidth="1.4"/>
    <path d="M6.5 11.5a1.5 1.5 0 003 0" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
}
function IconChart({ size=16, color='currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M1.5 13.5L5 9l3 2.5L11.5 6l3 3" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
}
function IconApi({ size=16, color='currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M5.5 10L3 8l2.5-2M10.5 6L13 8l-2.5 2" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 5l-2 6" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
}
function IconArch({ size=16, color='currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="1.5" width="4" height="3" rx="1" stroke={color} strokeWidth="1.3"/>
    <rect x="6" y="1.5" width="4" height="3" rx="1" stroke={color} strokeWidth="1.3"/>
    <rect x="10.5" y="1.5" width="4" height="3" rx="1" stroke={color} strokeWidth="1.3"/>
    <rect x="4" y="11.5" width="8" height="3" rx="1" stroke={color} strokeWidth="1.3"/>
    <path d="M3.5 4.5v2h9v-2M8 6.5v5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
}

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',     icon: IconGrid,  group: 'main' },
  { id: 'parking',      label: 'Plan parking',  icon: IconPark,  group: 'main' },
  { id: 'vehicules',    label: 'Véhicules',     icon: IconCar,   group: 'main' },
  { id: 'alertes',      label: 'Alertes',       icon: IconBell,  group: 'main' },
  { id: 'statistiques',  label: 'Statistiques',  icon: IconChart, group: 'data' },
  { id: 'registre',      label: 'Registre SOA',  icon: IconApi,   group: 'data' },
  { id: 'architecture',  label: 'Architecture',  icon: IconArch,  group: 'data' },
]

const ROLE_LABEL = { admin: 'Administrateur', agent: 'Agent parking', viewer: 'Visiteur' }
const ROLE_COLOR = { admin: '#EA580C', agent: '#059669', viewer: '#0284C7' }

/* ── Dashboard shell ────────────────────────────────────────── */
function DashboardApp({ user, onLogout }) {
  const [tab, setTab]               = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats]           = useState(null)
  const [zones, setZones]           = useState([])
  const [allPlaces, setAllPlaces]   = useState([])
  const [encours, setEncours]       = useState([])
  const [alertes, setAlertes]       = useState([])
  const [toasts, setToasts]         = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)
  const initialized = useRef(false)
  const prevAlertes = useRef(0)

  const addToast = useCallback((msg, type = 'info') => {
    const id = ++_tid
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [s, z, p, e, a] = await Promise.all([
        places.getStats(), places.getZones(), places.getAll(),
        transactions.getEncours(), transactions.getAlertes('active'),
      ])
      if (s.success) setStats(s.data)
      if (z.success) setZones(z.data)
      if (p.success) setAllPlaces(p.data)
      if (e.success) setEncours(e.data)
      if (a.success) {
        const nb = a.data.length
        if (initialized.current && nb > prevAlertes.current)
          addToast(`${nb - prevAlertes.current} nouvelle(s) alerte(s) détectée(s)`, 'danger')
        prevAlertes.current = nb
        setAlertes(a.data)
        initialized.current = true
      }
      setLastUpdate(new Date())
    } catch {}
  }, [addToast])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  const handleResoudre = async (id) => {
    try {
      const res = await transactions.resoudreAlerte(id)
      if (res.success) { addToast('Alerte résolue avec succès', 'success'); refresh() }
    } catch {}
  }

  const handleEntree = async (data) => {
    try {
      const res = await transactions.entree(data)
      if (res.success) {
        addToast(`Entrée enregistrée — ${res.data.plaque} → Place ${res.data.place_code}`, 'success')
        refresh(); return { ok: true }
      }
      return { ok: false, error: res.error }
    } catch { return { ok: false, error: 'Erreur réseau' } }
  }

  const handleSortie = async (txId) => {
    try {
      const res = await transactions.sortie({ transaction_id: txId })
      if (res.success) {
        const m = Number(res.data.montant_fcfa).toLocaleString('fr-FR')
        addToast(`Sortie enregistrée — ${res.data.plaque} · ${m} FCFA`, 'success')
        refresh(); return { ok: true }
      }
      return { ok: false, error: res.error }
    } catch { return { ok: false, error: 'Erreur réseau' } }
  }

  const navigate = (id) => { setTab(id); setSidebarOpen(false) }

  const nbAlert  = alertes.length
  const encBadge = encours.length
  const taux     = parseFloat(stats?.taux_occupation ?? 0)
  const roleColor = ROLE_COLOR[user.role] ?? '#EA580C'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>

      {sidebarOpen && (
        <div className="sidebar-overlay animate-fadein" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>

        {/* Logo */}
        <div style={{ padding: '18px 14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', boxShadow: '0 3px 10px rgba(234,88,12,0.4)' }}>SP</div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.2px' }}>SmartParking</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', fontWeight: 400, marginTop: 1 }}>SOA Platform · v2.0</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 10px 8px' }}>
          {[
            { group: 'main', label: 'Principal' },
            { group: 'data', label: 'Données' },
          ].map(({ group, label }) => {
            const items = NAV.filter(n => n.group === group)
            return (
              <div key={group} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)', padding: '0 11px 8px', textTransform: 'uppercase' }}>
                  {label}
                </div>
                {items.map(item => {
                  const active = tab === item.id
                  const badge  = item.id === 'alertes'  ? (nbAlert  > 0 ? nbAlert  : null)
                               : item.id === 'vehicules' ? (encBadge > 0 ? encBadge : null)
                               : null
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`nav-item${active ? ' active' : ''}`}
                      style={{ marginBottom: 2 }}
                    >
                      <span style={{ color: active ? '#FB923C' : 'rgba(255,255,255,0.28)', flexShrink: 0 }}>
                        <Icon size={15} color="currentColor" />
                      </span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {badge != null && (
                        <span className={item.id === 'alertes' ? 'animate-pulsebadge' : ''} style={{
                          minWidth: 19, height: 19, borderRadius: 5,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, paddingInline: 5,
                          fontFamily: "'Space Mono', monospace",
                          background: item.id === 'alertes' ? 'rgba(220,38,38,0.2)' : 'rgba(234,88,12,0.16)',
                          color:      item.id === 'alertes' ? '#FCA5A5' : '#FB923C',
                          border:     `1px solid ${item.id === 'alertes' ? 'rgba(220,38,38,0.3)' : 'rgba(234,88,12,0.28)'}`,
                        }}>
                          {badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Bottom: user + status */}
        <div style={{ padding: '12px 14px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>

          {/* User card */}
          <div style={{ marginBottom: 14, padding: '10px 11px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {user.initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.82)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 1 }}>{ROLE_LABEL[user.role]}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              style={{ width: '100%', padding: '6px', borderRadius: 6, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#FCA5A5', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.2)'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.2)' }}
            >
              ← Déconnexion
            </button>
          </div>

          {/* Occupation bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Occupation</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: stats ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.18)', fontFamily: "'Space Mono', monospace" }}>
                {stats ? `${stats.occupees}/${stats.total}` : '—'}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              {stats && (
                <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(taux, 100)}%`, background: taux >= 90 ? '#DC2626' : taux >= 75 ? '#D97706' : '#059669', transition: 'width 0.6s ease' }} />
              )}
            </div>
          </div>

          {lastUpdate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span className="animate-live" style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 400 }}>
                Sync {lastUpdate.toLocaleTimeString('fr-FR')}
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="main-shell">

        {/* Header */}
        <header style={{
          padding: '0 24px', height: 'var(--header-h)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--b0)',
          background: 'rgba(243,241,236,0.94)',
          backdropFilter: 'blur(14px)',
          position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
          boxShadow: '0 1px 0 var(--b0)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
              <span /><span /><span />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.2px' }}>
              {NAV.find(n => n.id === tab)?.label ?? 'Dashboard'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {nbAlert > 0 && (
              <button onClick={() => navigate('alertes')} className="animate-pulsebadge" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20,
                background: 'var(--red-lt)', border: '1px solid var(--red-bd)',
                color: 'var(--red)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
                {nbAlert} alerte{nbAlert > 1 ? 's' : ''}
              </button>
            )}
            <div style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 500 }} className="hide-mobile">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            {/* User pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 20, background: 'var(--bg)', border: '1px solid var(--b0)' }} className="hide-mobile">
              <div style={{ width: 20, height: 20, borderRadius: 5, background: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{user.initials}</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)' }}>{user.name}</span>
            </div>
          </div>
        </header>

        {/* Orange→sky accent bar */}
        <div style={{ height: 2, background: 'linear-gradient(90deg,#EA580C,#F97316 40%,#0284C7)', flexShrink: 0 }} />

        {/* Content */}
        <div key={tab} className="animate-fadeup content-pad" style={{ flex: 1, padding: '24px 28px 56px', overflowY: 'auto', minHeight: 0 }}>
          {tab === 'dashboard'    && <Dashboard        stats={stats} zones={zones} allPlaces={allPlaces} encours={encours} alertes={alertes} onEntree={handleEntree} onSortie={handleSortie} onTabChange={navigate} />}
          {tab === 'parking'     && <VueParkingGrille  places={allPlaces} zones={zones} />}
          {tab === 'vehicules'   && <ListeVehicules    encours={encours} onEntree={handleEntree} onSortie={handleSortie} />}
          {tab === 'alertes'     && <AlertesPanel      alertes={alertes} onResoudre={handleResoudre} />}
          {tab === 'statistiques'  && <StatistiquesParking />}
          {tab === 'registre'      && <RegistreServices />}
          {tab === 'architecture'  && <ArchitecturePage />}
        </div>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  )
}

/* ── Root router ────────────────────────────────────────────── */
export default function App() {
  const [page, setPage] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sp_auth')) ? 'app' : 'landing' } catch { return 'landing' }
  })
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sp_auth')) } catch { return null }
  })

  const login = useCallback((u) => {
    localStorage.setItem('sp_auth', JSON.stringify(u))
    setUser(u)
    setPage('app')
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('sp_auth')
    localStorage.removeItem('sp_jwt')
    setUser(null)
    setPage('login')
  }, [])

  useEffect(() => {
    window.addEventListener('sp:unauthorized', logout)
    return () => window.removeEventListener('sp:unauthorized', logout)
  }, [logout])

  if (page === 'landing') return <LandingPage onConnect={() => setPage('login')} />
  if (page === 'login')   return <LoginPage onLogin={login} onBack={() => setPage('landing')} />
  return <DashboardApp user={user} onLogout={logout} />
}
