export default function AlertesPanel({ alertes, onResoudre }) {
  if (!alertes.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 0', gap: 8 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: '#059669', marginBottom: 4,
        }}>✓</div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#334155' }}>Aucune alerte active</p>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Le parking fonctionne normalement</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Alertes actives</h2>
        <span style={{
          background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.22)',
          color: '#e11d48', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
        }}>
          {alertes.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alertes.map(a => {
          const crit = a.severite === 'critique'
          return (
            <div
              key={a.id}
              className="alert-item"
              style={{
                padding: '14px 18px', borderRadius: 12,
                background: crit ? '#fff5f6' : '#fffbeb',
                border: `1px solid ${crit ? '#fecdd3' : '#fde68a'}`,
                transition: 'background 0.15s',
              }}
            >
              <div className="alert-item-body">
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: crit ? '#e11d48' : '#d97706',
                  boxShadow: `0 0 8px ${crit ? 'rgba(225,29,72,0.4)' : 'rgba(217,119,6,0.4)'}`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e293b', lineHeight: 1.4 }}>
                    {a.message}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8' }}>
                    Zone {a.zone_code} — {new Date(a.cree_le).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="alert-item-actions">
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                  padding: '3px 9px', borderRadius: 20,
                  background: crit ? 'rgba(225,29,72,0.1)' : 'rgba(217,119,6,0.1)',
                  color: crit ? '#e11d48' : '#b45309',
                  border: `1px solid ${crit ? '#fecdd3' : '#fde68a'}`,
                }}>
                  {a.severite.toUpperCase()}
                </span>
                <button
                  onClick={() => onResoudre(a.id)}
                  style={{
                    background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)',
                    color: '#059669', fontSize: 12, fontWeight: 600,
                    padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(5,150,105,0.15)'; e.currentTarget.style.borderColor = 'rgba(5,150,105,0.35)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(5,150,105,0.08)'; e.currentTarget.style.borderColor = 'rgba(5,150,105,0.2)' }}
                >
                  Résoudre
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
