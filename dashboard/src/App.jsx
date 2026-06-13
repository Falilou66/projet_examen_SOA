import { useState, useEffect } from 'react'
import MapQuartiers from './components/MapQuartiers.jsx'
import GraphiqueTemps from './components/GraphiqueTemps.jsx'
import ListeIncidents from './components/ListeIncidents.jsx'
import RegistreServices from './components/RegistreServices.jsx'
import { surveillance, incidents } from './services/api.js'
import './App.css'

export default function App() {
  const [tab, setTab]               = useState('carte')
  const [dernieres, setDernieres]   = useState([])
  const [nbIncidents, setNbIncidents] = useState(0)

  const refresh = async () => {
    try {
      const [d, i] = await Promise.all([
        surveillance.getDernieres(),
        incidents.getAll({ statut: 'actif' }),
      ])
      if (d.success) setDernieres(d.data)
      if (i.success) setNbIncidents(i.data.length)
    } catch {
      // Gateway non disponible au démarrage — silencieux
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 10_000)
    return () => clearInterval(id)
  }, [])

  const TABS = [
    { id: 'carte',      label: 'Carte temps réel' },
    { id: 'graphiques', label: 'Graphiques' },
    { id: 'incidents',  label: `Incidents (${nbIncidents})` },
    { id: 'registre',   label: 'Registre SOA' },
  ]

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">
          <span className="header-icon">🌍</span>
          <div>
            <h1>SenCity</h1>
            <p>Surveillance Environnementale Urbaine — Dakar</p>
          </div>
        </div>
        {nbIncidents > 0 && (
          <div className="badge-alerte">{nbIncidents} incident(s) actif(s)</div>
        )}
      </header>

      <nav className="nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === 'carte'      && <MapQuartiers mesures={dernieres} />}
        {tab === 'graphiques' && <GraphiqueTemps />}
        {tab === 'incidents'  && <ListeIncidents onRefresh={refresh} />}
        {tab === 'registre'   && <RegistreServices />}
      </main>
    </div>
  )
}
