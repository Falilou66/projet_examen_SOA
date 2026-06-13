import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend,
} from 'chart.js'
import { surveillance } from '../services/api.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const TYPES = ['temperature', 'humidite', 'aqi', 'bruit', 'eau']

const COULEURS = [
  '#e63946', '#2196f3', '#ff9800', '#4caf50', '#9c27b0',
]

const UNITES = {
  temperature: '°C',
  humidite:    '%',
  aqi:         'indice',
  bruit:       'dB',
  eau:         'cm',
}

export default function GraphiqueTemps() {
  const [type, setType]   = useState('temperature')
  const [data, setData]   = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const res = await surveillance.getMesures({ type, limit: 60 })
        if (!active || !res.success) return

        const mesures  = [...res.data].reverse()
        const quartiers = [...new Set(mesures.map(m => m.quartier))]

        const datasets = quartiers.map((q, i) => {
          const pts = mesures.filter(m => m.quartier === q)
          return {
            label:       q,
            data:        pts.map(m => ({ x: new Date(m.timestamp).toLocaleTimeString('fr-FR'), y: +m.valeur })),
            borderColor: COULEURS[i % COULEURS.length],
            backgroundColor: COULEURS[i % COULEURS.length] + '22',
            tension:     0.3,
            fill:        false,
            pointRadius: 3,
          }
        })

        setData({ datasets })
        setError(null)
      } catch {
        setError('Impossible de charger les données')
      }
    }

    load()
    const id = setInterval(load, 10_000)
    return () => { active = false; clearInterval(id) }
  }, [type])

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: `Évolution — ${type} (${UNITES[type]}) — 60 dernières mesures`,
        font: { size: 14 },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Heure' },
        ticks: { maxTicksLimit: 10 },
      },
      y: {
        title: { display: true, text: UNITES[type] },
      },
    },
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Graphiques temps réel</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {TYPES.map(t => (
            <button
              key={t}
              className={type === t ? 'active' : ''}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ color: '#e63946', padding: '1rem' }}>{error}</p>}
      {!error && !data && <p style={{ color: '#999', padding: '1rem' }}>Chargement…</p>}
      {data && <Line data={data} options={options} />}
    </div>
  )
}
