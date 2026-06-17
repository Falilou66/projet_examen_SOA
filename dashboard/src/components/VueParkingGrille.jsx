import { useState } from 'react'

const ZONE = {
  A: { grad: 'linear-gradient(135deg,#1e40af,#3b82f6)', badge: 'rgba(59,130,246,0.15)', badgeC: '#1d4ed8', badgeBd: 'rgba(59,130,246,0.25)' },
  B: { grad: 'linear-gradient(135deg,#5b21b6,#8b5cf6)', badge: 'rgba(139,92,246,0.15)', badgeC: '#6d28d9', badgeBd: 'rgba(139,92,246,0.25)' },
  C: { grad: 'linear-gradient(135deg,#92400e,#d97706)', badge: 'rgba(217,119,6,0.15)',  badgeC: '#92400e', badgeBd: 'rgba(217,119,6,0.25)' },
}
const TYPE_BADGE = {
  handicape: { label: 'PMR', bg: 'rgba(109,40,217,0.1)', c: '#6d28d9' },
  vip:       { label: 'VIP', bg: 'rgba(180,83,9,0.1)',   c: '#b45309' },
}

function PlaceCell({ place, onClick }) {
  const occ = place.statut === 'occupe'
  const hs  = place.statut === 'hors_service'
  const tb  = TYPE_BADGE[place.type]

  const style = {
    width: 68, height: 68, borderRadius: 10, border: '1px solid',
    borderColor: occ ? '#fca5a5' : hs ? '#e2e8f0' : '#a7f3d0',
    background:  occ ? '#fff5f5' : hs ? '#f8fafc' : '#f0fdf9',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 2, cursor: occ ? 'pointer' : hs ? 'not-allowed' : 'default',
    transition: 'all 0.14s ease', position: 'relative',
    opacity: hs ? 0.45 : 1,
  }

  return (
    <button
      style={style}
      onClick={() => occ && onClick(place)}
      onMouseEnter={e => {
        if (hs) return
        e.currentTarget.style.transform = 'scale(1.06)'
        e.currentTarget.style.boxShadow = occ ? '0 4px 14px rgba(225,29,72,0.15)' : '0 4px 14px rgba(5,150,105,0.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
      title={occ ? `${place.plaque} — cliquer pour détails` : place.code}
    >
      <span style={{
        fontSize: 10, fontWeight: 700, fontFamily: 'SF Mono, Fira Code, monospace',
        color: occ ? '#dc2626' : hs ? '#94a3b8' : '#059669', lineHeight: 1,
      }}>
        {place.code}
      </span>
      {tb && (
        <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: tb.bg, color: tb.c }}>
          {tb.label}
        </span>
      )}
      {occ && (
        <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#ef4444', maxWidth: 62, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {place.plaque}
        </span>
      )}
      {hs && <span style={{ fontSize: 8, color: '#94a3b8' }}>H.S.</span>}
    </button>
  )
}

function Modal({ place, onClose }) {
  if (!place) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-fadeup"
        style={{
          width: '100%', maxWidth: 360,
          background: '#ffffff', border: '1px solid #e2e8f0',
          borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{
          background: 'linear-gradient(135deg,#fee2e2,#fecdd3)',
          borderBottom: '1px solid #fecdd3',
          padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#9f1239' }}>Place {place.code}</div>
            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>Zone {place.zone_code} — Occupée</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.1)',
              color: '#64748b', width: 28, height: 28, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 13,
            }}
          >✕</button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            ['Plaque',        place.plaque ?? '—'],
            ['Type',          place.type === 'handicape' ? 'PMR' : place.type],
            ['Occupé depuis', place.occupe_le ? new Date(place.occupe_le).toLocaleString('fr-FR') : '—'],
          ].map(([k, v]) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '11px 0', borderBottom: '1px solid #f1f5f9',
            }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', fontFamily: k === 'Plaque' ? 'monospace' : undefined }}>{v}</span>
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', animation: 'spin 1s linear infinite' }} />
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>Chargement du plan…</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Plan du parking — temps réel</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: '#64748b' }}>
          {[
            { color: '#a7f3d0', bg: '#f0fdf9', label: 'Libre' },
            { color: '#fca5a5', bg: '#fff5f5', label: 'Occupé' },
            { color: '#e2e8f0', bg: '#f8fafc', label: 'H.S.' },
          ].map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, border: `1px solid ${l.color}`, background: l.bg, display: 'inline-block' }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {zones.map(zone => {
          const zm     = ZONE[zone.code] ?? ZONE.A
          const taux   = parseFloat(zone.taux_occupation ?? 0)
          const libres = zone.places_libres ?? 0
          const zonePl = places.filter(p => p.zone_code === zone.code)
          const pct    = Math.min(taux, 100)

          return (
            <div key={zone.code} style={{
              borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                background: zm.grad, padding: '12px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, color: '#fff',
                  }}>
                    {zone.code}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{zone.nom}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)',
                    padding: '2px 8px', borderRadius: 20,
                  }}>
                    {Number(zone.tarif_horaire).toLocaleString('fr-FR')} FCFA/h
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                    {libres} libre{libres > 1 ? 's' : ''}
                  </span>
                  <div style={{ width: 80, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3, width: `${pct}%`,
                      background: taux >= 90 ? '#fca5a5' : taux >= 75 ? '#fde68a' : '#a7f3d0',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', minWidth: 32, textAlign: 'right' }}>
                    {taux.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div style={{ padding: 14, background: '#fafbfc', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {zonePl.map(p => <PlaceCell key={p.code} place={p} onClick={setSelected} />)}
              </div>
            </div>
          )
        })}
      </div>

      <Modal place={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
