import { useState, useEffect } from 'react'
import { reporting } from '../services/api.js'

const PERIODES = [
  { id: 'aujourd_hui', label: "Aujourd'hui" },
  { id: 'semaine',     label: '7 jours' },
  { id: 'mois',        label: '30 jours' },
]

const ZONE_GRAD = {
  A: 'linear-gradient(90deg,#1d4ed8,#3b82f6)',
  B: 'linear-gradient(90deg,#6d28d9,#8b5cf6)',
  C: 'linear-gradient(90deg,#b45309,#d97706)',
}
const TYPE_GRAD = {
  voiture: 'linear-gradient(90deg,#312e81,#6366f1)',
  moto:    'linear-gradient(90deg,#164e63,#06b6d4)',
  camion:  'linear-gradient(90deg,#7c2d12,#f97316)',
}
const TYPE_ICON = { voiture: '🚗', moto: '🏍', camion: '🚛' }

function MiniKpi({ value, label, icon, color }) {
  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e2e8f0',
      borderRadius: 12, padding: '14px 16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 18, marginBottom: 6, lineHeight: 1 }}>{icon}</div>
      <div style={{
        fontSize: 22, fontWeight: 800, color: color ?? '#0f172a',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}

function HBar({ label, value, maxVal, grad, icon }) {
  const pct = maxVal > 0 ? Math.max((value / maxVal) * 100, value > 0 ? 1.5 : 0) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 80, textAlign: 'right', fontSize: 11, color: '#64748b', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {icon ? `${icon} ` : ''}{label}
      </div>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4, width: `${pct}%`,
          background: grad ?? 'linear-gradient(90deg,#4f46e5,#818cf8)',
          transition: 'width 0.6s cubic-bezier(.22,.68,0,1.2)',
        }} />
      </div>
      <div style={{ width: 90, fontSize: 11, fontWeight: 700, color: '#475569', flexShrink: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {Number(value).toLocaleString('fr-FR')} F
      </div>
    </div>
  )
}

function BarChart({ data, pointe }) {
  const maxVal = Math.max(...Object.values(data).map(Number), 1)
  const entries = Object.entries(data)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
        {entries.map(([h, n]) => {
          const pct     = maxVal > 0 ? (Number(n) / maxVal) * 100 : 0
          const isMax   = Number(h) === Number(pointe)
          const visible = Number(n) > 0
          return (
            <div
              key={h}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}
              title={`${h}h : ${n} entrée(s)`}
            >
              <div style={{
                width: '100%',
                height: `${Math.max(pct, visible ? 2 : 0)}%`,
                minHeight: visible ? 2 : 0,
                borderRadius: '3px 3px 0 0',
                background: isMax
                  ? 'linear-gradient(180deg,#e11d48,#be123c)'
                  : 'linear-gradient(180deg,#6366f1,#4338ca)',
                transition: 'background 0.2s',
              }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', marginTop: 6 }}>
        {entries.map(([h]) => (
          <div key={h} style={{
            flex: 1, fontSize: 9, textAlign: 'center',
            color: Number(h) % 6 === 0 ? '#94a3b8' : 'transparent',
            userSelect: 'none',
          }}>
            {h}h
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StatistiquesParking() {
  const [periode, setPeriode]     = useState('aujourd_hui')
  const [stats, setStats]         = useState(null)
  const [revenus, setRevenus]     = useState(null)
  const [tendances, setTendances] = useState(null)
  const [loading, setLoading]     = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [s, r, t] = await Promise.all([
        reporting.statistiques(periode),
        reporting.revenus(periode),
        reporting.tendances(),
      ])
      if (s.success) setStats(s.data)
      if (r.success) setRevenus(r.data)
      if (t.success) setTendances(t.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [periode])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: 12, color: '#94a3b8' }}>Calcul des statistiques…</span>
      </div>
    )
  }

  const parZone     = revenus?.par_zone ?? {}
  const parType     = revenus?.par_type_vehicule ?? {}
  const maxZone     = Math.max(...Object.values(parZone).map(Number), 1)
  const maxType     = Math.max(...Object.values(parType).map(Number), 1)
  const parHeure    = tendances?.transactions_par_heure ?? {}
  const heurePointe = tendances?.heure_pointe
  const occ         = stats?.occupation_actuelle

  const card = {
    background: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Statistiques</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', gap: 2,
            background: '#f1f5f9', border: '1px solid #e2e8f0',
            borderRadius: 10, padding: 4,
          }}>
            {PERIODES.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriode(p.id)}
                style={{
                  padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: periode === p.id ? '#ffffff' : 'transparent',
                  color: periode === p.id ? '#4f46e5' : '#64748b',
                  boxShadow: periode === p.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <a
            href={`/api/reporting/rapport/export?periode=${periode}`}
            download
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 9,
              background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)',
              color: '#4f46e5', fontSize: 11, fontWeight: 600,
              textDecoration: 'none', transition: 'all 0.15s',
            }}
          >
            ⬇ CSV
          </a>
        </div>
      </div>

      {/* Mini KPIs */}
      {stats && (
        <div className="g-5" style={{ marginBottom: 20 }}>
          <MiniKpi icon="⬆" value={stats.nb_entrees} label="Entrées" />
          <MiniKpi icon="⬇" value={stats.nb_sorties} label="Sorties" />
          <MiniKpi icon="⏱" value={`${stats.duree_moyenne_minutes}m`} label="Durée moy." />
          <MiniKpi icon="💰" value={`${Number(stats.revenus_fcfa ?? 0).toLocaleString('fr-FR')} F`} label="Revenus" color="#059669" />
          {occ && (
            <MiniKpi icon="📊" value={`${occ.taux_occupation ?? 0}%`} label="Occupation"
              color={parseFloat(occ.taux_occupation) >= 90 ? '#e11d48' : '#4f46e5'} />
          )}
        </div>
      )}

      {/* Revenue bars */}
      <div className="g-2" style={{ marginBottom: 14 }}>
        <div style={{ ...card, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Revenus par zone</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              Total : {Number(revenus?.total_fcfa ?? 0).toLocaleString('fr-FR')} F
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(parZone).map(([z, v]) => (
              <HBar key={z} label={`Zone ${z}`} value={Number(v)} maxVal={maxZone} grad={ZONE_GRAD[z]} />
            ))}
            {Object.keys(parZone).length === 0 && (
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>Aucune donnée</p>
            )}
          </div>
        </div>

        <div style={{ ...card, padding: '16px 18px' }}>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Revenus par type</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(parType).map(([t, v]) => (
              <HBar key={t} label={t} value={Number(v)} maxVal={maxType} grad={TYPE_GRAD[t]} icon={TYPE_ICON[t]} />
            ))}
            {Object.keys(parType).length === 0 && (
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>Aucune donnée</p>
            )}
          </div>
        </div>
      </div>

      {/* Hourly chart */}
      {tendances && (
        <div style={{ ...card, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Fréquentation horaire — 24h</span>
            {heurePointe !== undefined && (
              <span style={{ fontSize: 10, color: '#94a3b8' }}>
                Pointe :{' '}
                <span style={{ color: '#e11d48', fontWeight: 700 }}>{heurePointe}h</span>
                {' '}({tendances.nb_heure_pointe} véh.)
              </span>
            )}
          </div>
          <BarChart data={parHeure} pointe={heurePointe} />
        </div>
      )}
    </div>
  )
}
