import { useState } from 'react'
import { transactions } from '../services/api.js'

const TYPE_ICON  = { voiture: '🚗', moto: '🏍', camion: '🚛' }
const ZONE_STYLE = {
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-violet-100 text-violet-700',
  C: 'bg-amber-100 text-amber-700',
}
const TARIFS = { voiture: 500, moto: 200, camion: 1000 }

function dureeStr(minutes) {
  const m = Math.round(minutes)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60), mn = m % 60
  return mn > 0 ? `${h}h ${mn}min` : `${h}h`
}

function coutEstime(tx) {
  const entree = new Date(tx.entree_le)
  const dureeMin = (Date.now() - entree) / 60000
  const tarif = TARIFS[tx.type_vehicule] ?? 500
  return Math.round(Math.max(dureeMin, 30) / 60 * tarif)
}

export default function ListeVehicules({ encours, onRefresh }) {
  const [loading, setLoading] = useState(false)

  const handleSortie = async (tx) => {
    if (!confirm(`Enregistrer la sortie de ${tx.plaque} ?`)) return
    setLoading(true)
    try {
      const res = await transactions.sortie({ transaction_id: tx.id })
      if (res.success) {
        const m = Number(res.data.montant_fcfa).toLocaleString('fr-FR')
        alert(`✅ Sortie enregistrée — Montant : ${m} FCFA`)
        onRefresh()
      } else {
        alert(`❌ Erreur : ${res.error}`)
      }
    } catch {
      alert('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  if (!encours.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <span className="text-5xl mb-3">🅿</span>
        <p className="text-lg font-medium">Parking vide</p>
        <p className="text-sm mt-1">Aucun véhicule en stationnement</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900">
          Véhicules garés
          <span className="ml-2 bg-indigo-100 text-indigo-600 text-sm font-semibold
            px-2.5 py-0.5 rounded-full">
            {encours.length}
          </span>
        </h2>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Plaque', 'Type', 'Zone', 'Place', 'Entrée', 'Durée', 'Coût estimé', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500
                  uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {encours.map(tx => {
              const duree = tx.duree_minutes_actuelle ?? 0
              const cout  = coutEstime(tx)
              return (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-slate-800">{tx.plaque}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {TYPE_ICON[tx.type_vehicule] ?? '🚗'} {tx.type_vehicule}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${ZONE_STYLE[tx.zone_code] ?? 'bg-slate-100 text-slate-600'}`}>
                      Zone {tx.zone_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-700">{tx.place_code}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(tx.entree_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{dureeStr(duree)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${cout > 1000 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {cout.toLocaleString('fr-FR')} FCFA
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleSortie(tx)}
                      disabled={loading}
                      className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white
                        text-xs font-semibold px-3 py-1.5 rounded-lg border-0 transition-colors
                        whitespace-nowrap"
                    >
                      Sortie →
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
