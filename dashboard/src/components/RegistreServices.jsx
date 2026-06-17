import { useState, useEffect } from 'react'
import { registry } from '../services/api.js'

const SVC_META = {
  places:       { grad: 'linear-gradient(135deg,#1e3a8a,#2563eb)', icon: '🅿', short: 'PL', accent: '#1d4ed8' },
  transactions: { grad: 'linear-gradient(135deg,#4c1d95,#7c3aed)', icon: '↕',  short: 'TX', accent: '#6d28d9' },
  reporting:    { grad: 'linear-gradient(135deg,#7c2d12,#c2410c)', icon: '∿',  short: 'RP', accent: '#b45309' },
}
const DEP_COLOR = {
  places:       { bg: 'rgba(37,99,235,0.1)',  c: '#1d4ed8', bd: 'rgba(37,99,235,0.25)' },
  transactions: { bg: 'rgba(109,40,217,0.1)', c: '#6d28d9', bd: 'rgba(109,40,217,0.25)' },
  reporting:    { bg: 'rgba(180,83,9,0.1)',   c: '#b45309', bd: 'rgba(180,83,9,0.25)' },
}

/* ── Swagger embed viewer ─────────────────────────────────── */
function SwaggerFrame({ svc }) {
  const url = `http://localhost:8090/api/${svc.id}/docs`
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 12px', borderRadius: '8px 8px 0 0',
        background: '#f8fafc', border: '1px solid #e2e8f0', borderBottom: 'none',
        fontSize: 11, color: '#64748b',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>GET /api/{svc.id}/docs</span>
        <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>Swagger UI — Interactive</span>
      </div>
      <iframe
        src={url}
        title={`Swagger ${svc.nom}`}
        style={{
          width: '100%', height: 520, border: '1px solid #e2e8f0',
          borderRadius: '0 0 10px 10px', display: 'block',
        }}
      />
    </div>
  )
}

export default function RegistreServices() {
  const [data, setData]         = useState(null)
  const [error, setError]       = useState(null)
  const [ts, setTs]             = useState(null)
  const [swagger, setSwagger]   = useState(null)

  const load = async () => {
    try {
      const res = await registry.get()
      setData(res)
      setTs(new Date().toLocaleTimeString('fr-FR'))
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
          Registre des Services SOA
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {ts && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
              <span className="animate-live" style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#059669', display: 'inline-block',
              }} />
              {ts}
            </div>
          )}
          <button
            onClick={load}
            style={{
              padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: '#f1f5f9', border: '1px solid #e2e8f0',
              color: '#64748b', cursor: 'pointer', transition: 'all 0.14s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b' }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 10,
          background: '#fff5f6', border: '1px solid #fecdd3',
          color: '#e11d48', fontSize: 12,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Service cards */}
      <div className="g-3" style={{ marginBottom: 20 }}>
        {services.map(s => {
          const m      = SVC_META[s.id] ?? { grad: 'linear-gradient(135deg,#334155,#475569)', icon: '⊞', short: '?', accent: '#475569' }
          const online = s.statut === 'disponible'
          const active = swagger === s.id

          return (
            <div
              key={s.id}
              style={{
                borderRadius: 16, overflow: 'visible',
                border: `1px solid ${active ? m.accent + '40' : '#e2e8f0'}`,
                background: '#ffffff',
                boxShadow: active ? `0 4px 20px ${m.accent}20` : '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                if (active) return
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = active ? `0 4px 20px ${m.accent}20` : '0 1px 4px rgba(0,0,0,0.06)'
              }}
            >
              {/* Card header */}
              <div style={{
                background: m.grad, padding: '16px 18px', borderRadius: '15px 15px 0 0',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px',
                }}>
                  {m.short}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{s.nom}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>v{s.version}</div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 20,
                  background: online ? 'rgba(167,243,208,0.25)' : 'rgba(254,202,202,0.25)',
                  border: `1px solid ${online ? 'rgba(167,243,208,0.5)' : 'rgba(254,202,202,0.5)'}`,
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                    background: online ? '#a7f3d0' : '#fca5a5',
                    boxShadow: `0 0 6px ${online ? '#a7f3d0' : '#fca5a5'}`,
                  }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: online ? '#a7f3d0' : '#fca5a5', letterSpacing: '0.05em' }}>
                    {online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '14px 18px' }}>
                <p style={{ margin: '0 0 12px', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                  {s.description}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Endpoints</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
                      {s.endpoints}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Dépendances</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                      {s.dependances?.length > 0
                        ? s.dependances.map(d => {
                          const dc = DEP_COLOR[d] ?? { bg: '#f1f5f9', c: '#475569', bd: '#e2e8f0' }
                          return (
                            <span key={d} style={{
                              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                              background: dc.bg, color: dc.c, border: `1px solid ${dc.bd}`,
                            }}>{d}</span>
                          )
                        })
                        : <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Links */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => setSwagger(swagger === s.id ? null : s.id)}
                    style={{
                      flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600,
                      padding: '7px 0', borderRadius: 8, cursor: 'pointer', transition: 'all 0.13s',
                      background: active ? `${m.accent}15` : 'rgba(79,70,229,0.08)',
                      border: `1px solid ${active ? m.accent + '40' : 'rgba(79,70,229,0.2)'}`,
                      color: active ? m.accent : '#4f46e5',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(79,70,229,0.14)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'rgba(79,70,229,0.08)' }}
                  >
                    {active ? '▲ Fermer' : '⚡ Swagger UI'}
                  </button>
                  <a
                    href={s.health} target="_blank" rel="noreferrer"
                    style={{
                      flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600,
                      padding: '7px 0', borderRadius: 8, textDecoration: 'none', transition: 'all 0.13s',
                      background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)',
                      color: '#059669',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(5,150,105,0.15)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(5,150,105,0.08)' }}
                  >
                    Health ●
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Swagger embed panel */}
      {swagger && (() => {
        const svc = services.find(s => s.id === swagger)
        if (!svc) return null
        return (
          <div style={{
            marginBottom: 20,
            background: '#ffffff', border: '1px solid #e2e8f0',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}>
            <div style={{
              padding: '12px 18px',
              background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  Documentation — {svc.nom}
                </span>
                <span style={{ marginLeft: 10, fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                  http://localhost:8090/api/{svc.id}/docs
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={`http://localhost:8090/api/${svc.id}/docs`}
                  target="_blank" rel="noreferrer"
                  style={{
                    padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                    background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)',
                    color: '#4f46e5', textDecoration: 'none',
                  }}
                >
                  Ouvrir ↗
                </a>
                <button
                  onClick={() => setSwagger(null)}
                  style={{
                    padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                    background: '#f1f5f9', border: '1px solid #e2e8f0',
                    color: '#94a3b8', cursor: 'pointer',
                  }}
                >
                  ✕ Fermer
                </button>
              </div>
            </div>
            <SwaggerFrame svc={svc} />
          </div>
        )
      })()}

      {/* JSON viewer */}
      {data?.registry && (
        <div style={{
          borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0', overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 16px', borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>GET /api/registry</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#059669' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
              200 OK
            </span>
          </div>
          <pre style={{
            margin: 0, padding: '14px 16px',
            fontSize: 11, lineHeight: 1.7,
            fontFamily: 'SF Mono, Fira Code, Consolas, monospace',
            color: '#0f6b4c',
            maxHeight: 220, overflow: 'auto',
          }}>
            {JSON.stringify(data.registry, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
