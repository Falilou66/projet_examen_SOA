import { useState, useEffect } from 'react'
import { reporting } from '../services/api.js'

const PERIODES = [
  { id: 'aujourd_hui', label: "Aujourd'hui" },
  { id: 'semaine',     label: '7 jours' },
  { id: 'mois',        label: '30 jours' },
]

const ZONE_COLOR  = { A: 'bg-blue-500',   B: 'bg-violet-500',  C: 'bg-amber-500'  }
const TYPE_COLOR  = { voiture: 'bg-indigo-500', moto: 'bg-cyan-500', camion: 'bg-orange-500' }
const TYPE_ICON   = { voiture: '🚗', moto: '🏍', camion: '🚛' }

function StatCard({ icon, value, label, sub, color = 'bg-slate-100 text-slate-700' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1 shadow-sm">
      <span className="text-xl">{icon}</span>
      <span className="text-2xl font-black text-slate-900">{value}</span>
      <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</span>
      {sub && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full self-start ${color}`}>{sub}</span>}
    </div>
  )
}

function HBarRow({ label, value, maxVal, colorClass, icon }) {
  const pct = maxVal > 0 ? (value / maxVal) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-right text-xs font-medium text-slate-600 shrink-0">
        {icon ? `${icon} ` : ''}{label}
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${Math.max(pct, value > 0 ? 2 : 0)}%` }}
        />
      </div>
      <div className="w-28 text-xs font-bold text-slate-700 shrink-0">
        {Number(value).toLocaleString('fr-FR')} FCFA
      </div>
    </div>
  )
}

export default function StatistiquesParking() {
  const [periode, setPeriode] = useState('aujourd_hui')
  const [stats, setStats]     = useState(null)
  const [revenus, setRevenus] = useState(null)
  const [tendances, setTendances] = useState(null)
  const [loading, setLoading] = useState(true)

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
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mb-3" />
        <p>Chargement des statistiques…</p>
      </div>
    )
  }

  const parZone = revenus?.par_zone ?? {}
  const parType = revenus?.par_type_vehicule ?? {}
  const maxZone = Math.max(...Object.values(parZone).map(Number), 1)
  const maxType = Math.max(...Object.values(parType).map(Number), 1)

  const parHeure   = tendances?.transactions_par_heure ?? {}
  const maxHeure   = Math.max(...Object.values(parHeure).map(Number), 1)
  const heurePointe = tendances?.heure_pointe

  const totalRevFmt = Number(revenus?.total_fcfa ?? 0).toLocaleString('fr-FR')
  const occActuelle = stats?.occupation_actuelle

  return (
    <div>
      {/* Titre + Période + Export */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-slate-900">Statistiques</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {PERIODES.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriode(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-0 transition-all ${
                  periode === p.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 bg-transparent'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <a
            href={`/api/reporting/rapport/export?periode=${periode}`}
            download
            className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold
              px-3 py-2 rounded-xl hover:bg-slate-700 transition-colors no-underline"
          >
            ⬇ CSV
          </a>
        </div>
      </div>

      {/* KPIs résumé */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <StatCard icon="⬆" value={stats.nb_entrees}  label="Entrées" />
          <StatCard icon="⬇" value={stats.nb_sorties}  label="Sorties" />
          <StatCard icon="⏱" value={`${stats.duree_moyenne_minutes} min`} label="Durée moy." />
          <StatCard
            icon="💰"
            value={`${Number(stats.revenus_fcfa ?? 0).toLocaleString('fr-FR')} F`}
            label="Revenus"
            color="bg-emerald-100 text-emerald-700"
            sub="FCFA"
          />
          {occActuelle && (
            <StatCard
              icon="📊"
              value={`${occActuelle.taux_occupation ?? 0}%`}
              label="Occupation"
              sub={`${occActuelle.occupees ?? 0}/${occActuelle.total ?? 0} places`}
              color={parseFloat(occActuelle.taux_occupation) >= 90 ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}
            />
          )}
        </div>
      )}

      {/* Revenus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            💰 Revenus par zone
            <span className="text-slate-400 font-normal text-xs ml-auto">Total : {totalRevFmt} FCFA</span>
          </h3>
          <div className="flex flex-col gap-3">
            {Object.entries(parZone).map(([z, v]) => (
              <HBarRow key={z} label={`Zone ${z}`} value={Number(v)} maxVal={maxZone}
                colorClass={ZONE_COLOR[z] ?? 'bg-slate-400'} />
            ))}
            {Object.keys(parZone).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-3">Aucune donnée</p>
            )}
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">🚗 Revenus par type</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(parType).map(([t, v]) => (
              <HBarRow key={t} label={t} value={Number(v)} maxVal={maxType}
                colorClass={TYPE_COLOR[t] ?? 'bg-slate-400'} icon={TYPE_ICON[t]} />
            ))}
            {Object.keys(parType).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-3">Aucune donnée</p>
            )}
          </div>
        </div>
      </div>

      {/* Graphique horaire */}
      {tendances && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
            📈 Fréquentation par heure (24h)
            {heurePointe !== undefined && (
              <span className="text-xs font-normal text-slate-400 ml-auto">
                Pointe : {heurePointe}h ({tendances.nb_heure_pointe} véhicules)
              </span>
            )}
          </h3>
          <div className="flex items-end gap-0.5 h-20 mt-3 px-1">
            {Object.entries(parHeure).map(([h, n]) => {
              const pct  = maxHeure > 0 ? (Number(n) / maxHeure) * 100 : 0
              const isPointe = Number(h) === Number(heurePointe)
              return (
                <div
                  key={h}
                  className="flex-1 flex flex-col justify-end items-center group relative"
                  title={`${h}h : ${n} entrée(s)`}
                >
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isPointe ? 'bg-rose-500' : 'bg-indigo-400 group-hover:bg-indigo-500'
                    }`}
                    style={{ height: `${Math.max(pct, Number(n) > 0 ? 3 : 0)}%` }}
                  />
                  {Number(h) % 6 === 0 && (
                    <span className="text-[9px] text-slate-400 mt-1 absolute -bottom-4">{h}h</span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-6 flex justify-between text-[10px] text-slate-400 px-1">
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
        </div>
      )}
    </div>
  )
}
