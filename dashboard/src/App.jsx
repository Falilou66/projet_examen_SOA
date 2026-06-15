import { useState, useEffect, useRef, useCallback } from 'react'
import VueParkingGrille from './components/VueParkingGrille.jsx'
import ListeVehicules from './components/ListeVehicules.jsx'
import StatistiquesParking from './components/StatistiquesParking.jsx'
import RegistreServices from './components/RegistreServices.jsx'
import KpiCards from './components/KpiCards.jsx'
import { places, transactions } from './services/api.js'
import './App.css'

let _tid = 0

function Toast({ toast }) {
  const bg = {
    danger:  'bg-rose-500',
    success: 'bg-emerald-500',
    info:    'bg-slate-800',
  }[toast.type] ?? 'bg-slate-800'

  return (
    <div className={`${bg} text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium
      max-w-xs animate-slidein flex items-center gap-2`}>
      {toast.msg}
    </div>
  )
}

function ToastStack({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      {toasts.map(t => <Toast key={t.id} toast={t} />)}
    </div>
  )
}

function AlertesPanel({ alertes, onResoudre }) {
  if (!alertes.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <span className="text-5xl mb-3">✅</span>
        <p className="text-lg font-medium">Aucune alerte active</p>
        <p className="text-sm mt-1">Le parking fonctionne normalement</p>
      </div>
    )
  }
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-4">
        Alertes actives
        <span className="ml-2 bg-rose-100 text-rose-600 text-sm font-semibold px-2.5 py-0.5 rounded-full">
          {alertes.length}
        </span>
      </h2>
      <div className="flex flex-col gap-3">
        {alertes.map(a => (
          <div
            key={a.id}
            className={`flex items-center gap-4 p-4 rounded-xl border ${
              a.severite === 'critique'
                ? 'bg-rose-50 border-rose-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <span className="text-2xl">{a.severite === 'critique' ? '🔴' : '🟡'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">{a.message}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Zone {a.zone_code} — {new Date(a.cree_le).toLocaleString('fr-FR')}
              </p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              a.severite === 'critique'
                ? 'bg-rose-100 text-rose-600'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {a.severite.toUpperCase()}
            </span>
            <button
              onClick={() => onResoudre(a.id)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold
                px-3 py-1.5 rounded-lg border-0 transition-colors shrink-0"
            >
              Résoudre
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const TABS = [
  { id: 'parking',      icon: '🅿', label: 'Plan parking' },
  { id: 'vehicules',    icon: '🚗', label: 'Véhicules' },
  { id: 'alertes',      icon: '⚠',  label: 'Alertes' },
  { id: 'statistiques', icon: '📊', label: 'Statistiques' },
  { id: 'registre',     icon: '⚙',  label: 'Registre SOA' },
]

export default function App() {
  const [tab, setTab]             = useState('parking')
  const [stats, setStats]         = useState(null)
  const [zones, setZones]         = useState([])
  const [allPlaces, setAllPlaces] = useState([])
  const [encours, setEncours]     = useState([])
  const [alertes, setAlertes]     = useState([])
  const [toasts, setToasts]       = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)
  const initialized  = useRef(false)
  const prevAlertes  = useRef(0)

  const addToast = useCallback((msg, type = 'info') => {
    const id = ++_tid
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [s, z, p, e, a] = await Promise.all([
        places.getStats(),
        places.getZones(),
        places.getAll(),
        transactions.getEncours(),
        transactions.getAlertes('active'),
      ])
      if (s.success) setStats(s.data)
      if (z.success) setZones(z.data)
      if (p.success) setAllPlaces(p.data)
      if (e.success) setEncours(e.data)
      if (a.success) {
        const nb = a.data.length
        if (initialized.current && nb > prevAlertes.current) {
          addToast(`🚨 ${nb - prevAlertes.current} nouvelle(s) alerte(s) !`, 'danger')
        }
        prevAlertes.current = nb
        setAlertes(a.data)
        initialized.current = true
      }
      setLastUpdate(new Date())
    } catch {}
  }, [addToast])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5_000)
    return () => clearInterval(id)
  }, [refresh])

  const handleResoudre = async (id) => {
    try {
      const res = await transactions.resoudreAlerte(id)
      if (res.success) { addToast('Alerte résolue', 'success'); refresh() }
    } catch {}
  }

  const tabLabel = (t) => {
    if (t.id === 'vehicules')  return `${t.label} (${encours.length})`
    if (t.id === 'alertes')    return `${t.label}${alertes.length ? ` (${alertes.length})` : ''}`
    return t.label
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500 text-white w-12 h-12 rounded-2xl flex items-center
              justify-center text-2xl font-black shadow-lg shadow-indigo-500/30">
              P
            </div>
            <div>
              <h1 className="text-white text-xl font-bold tracking-tight">SmartParking</h1>
              <p className="text-slate-400 text-xs">Gestion intelligente — Architecture SOA</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdate && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live inline-block" />
                MAJ {lastUpdate.toLocaleTimeString('fr-FR')}
              </div>
            )}
            {alertes.length > 0 && (
              <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1.5
                rounded-full animate-pulsebadge">
                {alertes.length} alerte{alertes.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-5">
        {/* ── KPI Cards ──────────────────────────────────────── */}
        <KpiCards stats={stats} alertes={alertes} />

        {/* ── Navigation ─────────────────────────────────────── */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                transition-all border-0 flex-1 justify-center min-w-[120px]
                ${tab === t.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 bg-transparent'
                }`}
            >
              <span>{t.icon}</span>
              <span>{tabLabel(t)}</span>
            </button>
          ))}
        </div>

        {/* ── Contenu principal ───────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[500px]">
          {tab === 'parking'      && <VueParkingGrille places={allPlaces} zones={zones} />}
          {tab === 'vehicules'    && <ListeVehicules encours={encours} onRefresh={refresh} />}
          {tab === 'alertes'      && <AlertesPanel alertes={alertes} onResoudre={handleResoudre} />}
          {tab === 'statistiques' && <StatistiquesParking />}
          {tab === 'registre'     && <RegistreServices />}
        </div>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  )
}
