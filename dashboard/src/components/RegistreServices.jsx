import { useState, useEffect } from 'react'
import { registry } from '../services/api.js'

const ICONES = {
  surveillance: '📡',
  incidents:    '🚨',
  reporting:    '📊',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Registre des Services SOA</h2>
        <span style={{ fontSize: '0.8rem', color: '#999' }}>
          Mis à jour : {ts ?? '…'}
        </span>
      </div>

      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid #dc3545', borderRadius: '8px', padding: '1rem', color: '#dc3545' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {services.map(s => (
          <div key={s.id} style={{
            border: '1px solid #e0e0e0',
            borderRadius: '10px',
            padding: '1.2rem',
            background: '#fafafa',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{ICONES[s.id] ?? '⚙️'}</span>
              <div>
                <h3 style={{ margin: 0 }}>{s.nom}</h3>
                <span style={{ fontSize: '0.75rem', color: '#999' }}>v{s.version}</span>
              </div>
              <span style={{
                marginLeft: 'auto',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                background: s.statut === 'disponible' ? '#e8f5e9' : '#ffebee',
                color:      s.statut === 'disponible' ? '#2e7d32' : '#c62828',
                fontWeight: 600,
              }}>
                {s.statut === 'disponible' ? '● Disponible' : '● Indisponible'}
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#555', marginBottom: '0.8rem' }}>
              {s.description}
            </p>

            <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div>
                <span style={{ color: '#999' }}>Endpoints : </span>
                <strong>{s.endpoints}</strong>
              </div>
              <div>
                <span style={{ color: '#999' }}>Dépendances : </span>
                {s.dependances?.length > 0
                  ? s.dependances.map(d => (
                    <span key={d} style={{
                      background: '#e3f2fd', color: '#1565c0',
                      padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', marginLeft: '0.2rem'
                    }}>
                      {d}
                    </span>
                  ))
                  : <span style={{ color: '#999' }}>Aucune</span>
                }
              </div>
            </div>

            <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem' }}>
              <a
                href={s.contrat}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.78rem', color: '#1a1a2e', textDecoration: 'underline' }}
              >
                Contrat OpenAPI →
              </a>
              <a
                href={s.health}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.78rem', color: '#28a745', textDecoration: 'underline' }}
              >
                Health check →
              </a>
            </div>
          </div>
        ))}
      </div>

      {data?.registry && (
        <div style={{ marginTop: '1.5rem', background: '#f5f5f5', borderRadius: '8px', padding: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Registre brut — <code>GET /api/registry</code>
          </h3>
          <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: 200, color: '#333' }}>
            {JSON.stringify(data.registry, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
