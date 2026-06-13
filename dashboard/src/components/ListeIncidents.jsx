import { useState, useEffect } from 'react'
import { incidents as api } from '../services/api.js'

const SEV_STYLE = {
  critique: { color: '#dc3545', background: '#fff5f5', border: '1px solid #dc3545' },
  warning:  { color: '#856404', background: '#fffbea', border: '1px solid #ffc107' },
}

export default function ListeIncidents({ onRefresh }) {
  const [liste, setListe]     = useState([])
  const [filtre, setFiltre]   = useState('actif')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const params = filtre === 'tous' ? {} : { statut: filtre }
    const res = await api.getAll(params)
    if (res.success) setListe(res.data)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10_000)
    return () => clearInterval(id)
  }, [filtre])

  const resoudre = async (id) => {
    await api.resoudre(id)
    load()
    onRefresh()
  }

  const verifier = async () => {
    setLoading(true)
    try {
      const res = await api.verifier()
      if (res.success) {
        const nb = res.data.incidents_crees
        alert(`Vérification terminée — ${nb} nouvel(s) incident(s) créé(s)`)
        load()
        onRefresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Incidents ({liste.length})</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {['actif', 'resolu', 'tous'].map(f => (
              <button key={f} className={filtre === f ? 'active' : ''} onClick={() => setFiltre(f)}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={verifier} disabled={loading} style={{ background: '#1a1a2e', color: 'white', border: 'none' }}>
            {loading ? 'Vérification…' : 'Vérifier les seuils'}
          </button>
        </div>
      </div>

      {liste.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
          Aucun incident {filtre !== 'tous' ? filtre : ''}.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Sévérité</th>
              <th>Quartier</th>
              <th>Type</th>
              <th>Valeur</th>
              <th>Seuil</th>
              <th>Message</th>
              <th>Créé le</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {liste.map(i => (
              <tr key={i.id}>
                <td>
                  <span style={{
                    ...SEV_STYLE[i.severite],
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}>
                    {i.severite?.toUpperCase()}
                  </span>
                </td>
                <td>{i.quartier}</td>
                <td>{i.type}</td>
                <td style={{ fontWeight: 600 }}>{i.valeur_mesuree}</td>
                <td style={{ color: '#999' }}>{i.seuil_depasse}</td>
                <td style={{ maxWidth: 250, fontSize: '0.8rem', color: '#555' }}>{i.message}</td>
                <td style={{ fontSize: '0.75rem', color: '#999' }}>
                  {new Date(i.cree_le).toLocaleString('fr-FR')}
                </td>
                <td>
                  {i.statut === 'actif' ? (
                    <button
                      onClick={() => resoudre(i.id)}
                      style={{ fontSize: '0.75rem', background: '#28a745', color: 'white', border: 'none' }}
                    >
                      Résoudre
                    </button>
                  ) : (
                    <span style={{ color: '#28a745', fontSize: '0.8rem' }}>✓ Résolu</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
