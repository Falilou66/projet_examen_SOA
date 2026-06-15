import { useState, useEffect } from 'react'
import { registry } from '../services/api.js'

const ICONES = {
  places:       '🅿',
  transactions: '🚗',
  reporting:    '📊',
}

const DEP_COLORS = {
  places:       'bg-blue-100 text-blue-700',
  transactions: 'bg-violet-100 text-violet-700',
  reporting:    'bg-amber-100 text-amber-700',
}

export default function RegistreServices() {
  const [data, setData]   = useState(null)
  const [error, setError] = useState(null)
  const [ts, setTs]       = useState(null)

  const load = async () => {
    try {
      const res = await registry.get()
      setData(res)
      setTs(new Date().toLocaleString('fr-FR'))
      setError(null)
    } catch {
      setError('Impossible de contacter la Gateway')
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10_000)
    return () => clearInterval(id)
  }, [])

  const services = data?.registry?.services ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900">Registre des Services SOA</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Mis à jour : {ts ?? '…'}</span>
          <button
            onClick={load}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600
              px-3 py-1.5 rounded-lg border-0 transition-colors"
          >
            ↻ Rafraîchir
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-600 text-sm mb-4">
          ⚠ {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {services.map(s => (
          <div
            key={s.id}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm
              hover:shadow-md transition-shadow"
          >
            {/* Card header */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 flex items-center gap-3">
              <span className="text-2xl bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center">
                {ICONES[s.id] ?? '⚙'}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm leading-tight">{s.nom}</h3>
                <span className="text-slate-400 text-xs">v{s.version}</span>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                s.statut === 'disponible'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}>
                {s.statut === 'disponible' ? '● ON' : '● OFF'}
              </span>
            </div>

            {/* Corps */}
            <div className="p-4">
              <p className="text-slate-500 text-xs mb-3 leading-relaxed">{s.description}</p>

              <div className="flex flex-col gap-2 text-xs mb-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Endpoints</span>
                  <span className="font-bold text-slate-700">{s.endpoints}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 shrink-0">Dépendances</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {s.dependances?.length > 0
                      ? s.dependances.map(d => (
                        <span key={d} className={`px-1.5 py-0.5 rounded font-semibold ${DEP_COLORS[d] ?? 'bg-slate-100 text-slate-600'}`}>
                          {d}
                        </span>
                      ))
                      : <span className="text-slate-400">Aucune</span>
                    }
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <a
                  href={s.contrat}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center text-xs text-indigo-600 hover:text-indigo-800
                    font-semibold py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg
                    transition-colors no-underline"
                >
                  OpenAPI →
                </a>
                <a
                  href={s.health}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center text-xs text-emerald-600 hover:text-emerald-800
                    font-semibold py-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg
                    transition-colors no-underline"
                >
                  Health ●
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* JSON brut */}
      {data?.registry && (
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs font-mono">GET /api/registry</span>
            <span className="text-emerald-400 text-xs">● live</span>
          </div>
          <pre className="text-emerald-300 text-xs overflow-auto max-h-48 leading-relaxed">
            {JSON.stringify(data.registry, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
