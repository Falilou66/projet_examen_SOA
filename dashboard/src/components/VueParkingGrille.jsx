import { useState } from 'react'

const ZONE_META = {
  A: { color: 'from-blue-600 to-blue-500',   badge: 'bg-blue-100 text-blue-700',   ring: 'ring-blue-300' },
  B: { color: 'from-violet-600 to-violet-500', badge: 'bg-violet-100 text-violet-700', ring: 'ring-violet-300' },
  C: { color: 'from-amber-600 to-amber-500',  badge: 'bg-amber-100 text-amber-700',  ring: 'ring-amber-300' },
}

const TYPE_LABEL = { standard: null, handicape: 'PMR', vip: 'VIP' }

function PlaceCell({ place, onClick }) {
  const isOccupe = place.statut === 'occupe'
  const isHS     = place.statut === 'hors_service'

  let style = 'bg-emerald-50 border-emerald-300 hover:border-emerald-500 hover:bg-emerald-100'
  if (isOccupe) style = 'bg-rose-50 border-rose-300 hover:border-rose-500 hover:bg-rose-100 cursor-pointer'
  if (isHS)     style = 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'

  return (
    <button
      className={`w-[72px] h-[72px] rounded-xl border-2 flex flex-col items-center
        justify-center gap-0.5 transition-all duration-150 hover:scale-105
        hover:shadow-md border-0 ${style}`}
      onClick={() => isOccupe && onClick(place)}
      title={isOccupe ? `${place.plaque} — cliquer pour détails` : place.code}
    >
      <span className="text-[11px] font-black text-slate-700 font-mono leading-none">
        {place.code}
      </span>
      {TYPE_LABEL[place.type] && (
        <span className={`text-[9px] font-bold px-1 rounded ${
          place.type === 'vip' ? 'text-amber-600 bg-amber-100' : 'text-violet-600 bg-violet-100'
        }`}>
          {TYPE_LABEL[place.type]}
        </span>
      )}
      {isOccupe && (
        <span className="text-[9px] font-mono text-rose-500 leading-none max-w-[64px]
          overflow-hidden text-ellipsis whitespace-nowrap px-0.5">
          {place.plaque}
        </span>
      )}
      {isHS && <span className="text-[10px] text-slate-400">HS</span>}
    </button>
  )
}

function Modal({ place, onClose }) {
  if (!place) return null
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">Place {place.code}</h3>
            <p className="text-rose-100 text-sm">Zone {place.zone_code} — Occupée</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl bg-transparent border-0 p-1"
          >
            ✕
          </button>
        </div>
        <div className="p-6 flex flex-col gap-3">
          {[
            ['Plaque',    place.plaque ?? '—'],
            ['Type',      place.type === 'handicape' ? 'PMR' : place.type],
            ['Occupé depuis', place.occupe_le ? new Date(place.occupe_le).toLocaleString('fr-FR') : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
              <span className="text-slate-500 text-sm">{k}</span>
              <span className="font-semibold text-slate-800 text-sm">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function VueParkingGrille({ places, zones }) {
  const [selected, setSelected] = useState(null)

  if (!places.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <span className="text-5xl mb-3 animate-spin">⏳</span>
        <p>Chargement du plan de parking…</p>
      </div>
    )
  }

  return (
    <div>
      {/* Légende + titre */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-slate-900">Plan du parking — temps réel</h2>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-emerald-400 bg-emerald-50 inline-block" />
            Libre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-rose-400 bg-rose-50 inline-block" />
            Occupé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-slate-300 bg-slate-100 inline-block" />
            Hors service
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {zones.map(zone => {
          const zonePlaces = places.filter(p => p.zone_code === zone.code)
          const meta  = ZONE_META[zone.code] ?? ZONE_META.A
          const taux  = parseFloat(zone.taux_occupation ?? 0)
          const libres = zone.places_libres ?? 0

          return (
            <div key={zone.code} className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {/* En-tête zone */}
              <div className={`bg-gradient-to-r ${meta.color} px-5 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className="text-white/80 text-sm font-medium">{zone.nom}</span>
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {Number(zone.tarif_horaire).toLocaleString('fr-FR')} FCFA/h
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm font-semibold">
                    {libres} libre{libres > 1 ? 's' : ''}
                  </span>
                  {/* Barre occupation */}
                  <div className="w-24 bg-white/30 rounded-full h-2 hidden sm:block">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        taux >= 90 ? 'bg-rose-300' : taux >= 75 ? 'bg-amber-300' : 'bg-emerald-300'
                      }`}
                      style={{ width: `${taux}%` }}
                    />
                  </div>
                  <span className="text-white/80 text-xs font-medium">{taux}%</span>
                </div>
              </div>

              {/* Grille des places */}
              <div className="p-4 bg-slate-50 flex flex-wrap gap-2">
                {zonePlaces.map(p => (
                  <PlaceCell key={p.code} place={p} onClick={setSelected} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Modal place={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
