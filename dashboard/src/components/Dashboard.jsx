import { useState, useEffect, useRef } from 'react'

function useCount(target, ms = 700) {
  const [val, setVal] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const diff  = target - from.current
    const tick  = (now) => {
      const t = Math.min((now - start) / ms, 1)
      const e = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(from.current + diff * e))
      if (t < 1) requestAnimationFrame(tick)
      else from.current = target
    }
    requestAnimationFrame(tick)
  }, [target])
  return val
}

/* ── Donut ───────────────────────────────────────────────── */
function Donut({ pct = 0, size = 148, stroke = 13 }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.max((pct / 100) * circ, 0)
  const color = pct >= 90 ? '#DC2626' : pct >= 75 ? '#D97706' : '#059669'
  const glow  = pct >= 90 ? '#DC262620' : pct >= 75 ? '#D9770620' : '#05966920'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible', filter: `drop-shadow(0 0 8px ${glow})` }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5DDD0" strokeWidth={stroke} />
      <circle
        className="donut-arc"
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ stroke: color }}
      />
    </svg>
  )
}

/* ── KPI card ────────────────────────────────────────────── */
function KCard({ val, label, sub, color, icon, flash, onClick }) {
  const P = {
    green:  { c:'#059669', lt:'#ECFDF5', bd:'#6EE7B7', vc:'#065F46', gl:'rgba(5,150,105,0.12)'  },
    red:    { c:'#DC2626', lt:'#FEF2F2', bd:'#FECACA', vc:'#991B1B', gl:'rgba(220,38,38,0.12)'  },
    amber:  { c:'#D97706', lt:'#FFFBEB', bd:'#FDE68A', vc:'#92400E', gl:'rgba(217,119,6,0.12)'  },
    sky:    { c:'#0284C7', lt:'#F0F9FF', bd:'#BAE6FD', vc:'#0C4A6E', gl:'rgba(2,132,199,0.12)'  },
    orange: { c:'#EA580C', lt:'#FFF7ED', bd:'#FDBA74', vc:'#9A3412', gl:'rgba(234,88,12,0.12)'  },
  }[color] ?? { c:'#EA580C', lt:'#FFF7ED', bd:'#FDBA74', vc:'#9A3412', gl:'rgba(234,88,12,0.12)' }

  const count = useCount(typeof val === 'number' ? val : 0, 700)

  return (
    <div
      className={`sp-card${flash ? ' animate-kpiflash' : ''}`}
      onClick={onClick}
      style={{
        padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: `3px solid ${P.bd}`,
        borderRadius: `0 var(--radius, 7px) var(--radius, 7px) 0`,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 22px ${P.gl}`; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: P.lt, border: `1px solid ${P.bd}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: P.c,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: P.vc, lineHeight: 1.1, letterSpacing: '-1.5px', fontFamily: "'Space Mono', monospace" }}>
          {typeof val === 'number' ? count : val}
        </div>
        <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#A8A29E', marginTop: 4 }}>
          {label}
        </div>
        <span style={{
          display: 'inline-block', marginTop: 5,
          fontSize: 9.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
          background: P.lt, color: P.c, border: `1px solid ${P.bd}`,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {sub}
        </span>
      </div>
    </div>
  )
}

/* ── Entry modal ─────────────────────────────────────────── */
function EntreeModal({ onClose, onSubmit }) {
  const [form, setForm]       = useState({ plaque: '', type_vehicule: 'voiture', zone: '' })
  const [err, setErr]         = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!form.plaque.trim()) { setErr('La plaque est requise'); return }
    setLoading(true); setErr(null)
    const payload = { plaque: form.plaque.trim().toUpperCase(), type_vehicule: form.type_vehicule }
    if (form.zone) payload.zone = form.zone
    const res = await onSubmit(payload)
    setLoading(false)
    if (res.ok) onClose(); else setErr(res.error ?? 'Erreur inconnue')
  }
  const field = k => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) })

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(19,15,13,0.5)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} className="animate-fadeup" style={{
        width: '100%', maxWidth: 440,
        background: '#fff', borderRadius: 12,
        boxShadow: '0 32px 80px rgba(28,25,23,0.22)', overflow: 'hidden',
        border: '1px solid #E2DDD3',
      }}>
        <div style={{
          background: 'linear-gradient(135deg,#FFF7ED,#FFFBEB)',
          padding: '18px 22px 16px', borderBottom: '1px solid #FDBA74',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#9A3412' }}>Nouvelle entrée véhicule</div>
            <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 3 }}>Place attribuée automatiquement par zone</div>
          </div>
          <button onClick={onClose} className="sp-btn sp-btn-ghost" style={{ width: 32, height: 32, padding: 0, borderRadius: 7, fontSize: 13 }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ padding: '22px 22px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <label className="sp-label">Plaque d'immatriculation</label>
            <input className="sp-input" type="text" placeholder="ex : DK-1234-A"
              style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, letterSpacing: '0.05em' }}
              {...field('plaque')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label className="sp-label">Type de véhicule</label>
              <select className="sp-input" {...field('type_vehicule')}>
                <option value="voiture">🚗 Voiture — 500 F/h</option>
                <option value="moto">🏍 Moto — 200 F/h</option>
                <option value="camion">🚛 Camion — 1 000 F/h</option>
              </select>
            </div>
            <div>
              <label className="sp-label">Zone (optionnel)</label>
              <select className="sp-input" {...field('zone')}>
                <option value="">Automatique</option>
                <option value="A">Zone A — Standard</option>
                <option value="B">Zone B — Mixte</option>
                <option value="C">Zone C — VIP</option>
              </select>
            </div>
          </div>
          {err && (
            <div style={{ padding: '10px 14px', borderRadius: 7, marginBottom: 16, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 12, fontWeight: 500 }}>
              {err}
            </div>
          )}
          <button type="submit" disabled={loading} className="sp-btn sp-btn-primary" style={{ width: '100%', padding: 12, fontSize: 13, borderRadius: 9, opacity: loading ? 0.7 : 1 }}>
            {loading ? '⌛ Enregistrement…' : '↑ Enregistrer l\'entrée'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Zone card ───────────────────────────────────────────── */
const ZG = {
  A: { g: 'linear-gradient(135deg,#0C4A6E,#0284C7)', badge: '#BAE6FD' },
  B: { g: 'linear-gradient(135deg,#14532D,#059669)', badge: '#6EE7B7' },
  C: { g: 'linear-gradient(135deg,#7C2D12,#EA580C)', badge: '#FDBA74' },
}
function ZoneCard({ zone }) {
  const m    = ZG[zone.code] ?? ZG.A
  const taux = parseFloat(zone.taux_occupation ?? 0)
  const pct  = Math.min(taux, 100)
  return (
    <div className="sp-card" style={{ overflow: 'hidden' }}>
      <div style={{ background: m.g, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{zone.nom}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: m.badge, fontFamily: "'Space Mono', monospace" }}>{taux.toFixed(0)}%</span>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#A8A29E', marginBottom: 9 }}>
          <span><b style={{ color: '#059669', fontFamily: "'Space Mono', monospace" }}>{zone.places_libres}</b> libres</span>
          <span><b style={{ color: '#DC2626', fontFamily: "'Space Mono', monospace" }}>{zone.places_occupees}</b> occupées</span>
          <span style={{ fontFamily: "'Space Mono', monospace" }}>{Number(zone.tarif_horaire).toLocaleString('fr-FR')} F/h</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: '#E5DDD0', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2, width: `${pct}%`,
            background: taux >= 90 ? '#DC2626' : taux >= 75 ? '#D97706' : '#059669',
            transition: 'width 0.8s cubic-bezier(.22,.68,0,1.2)',
          }} />
        </div>
      </div>
    </div>
  )
}

/* ── Activity row ────────────────────────────────────────── */
const ZC = { A:'#0284C7', B:'#059669', C:'#EA580C' }
function ActivityRow({ tx }) {
  const m = Math.round(tx.duree_minutes_actuelle ?? 0)
  const dur = m < 60 ? `${m}m` : `${Math.floor(m/60)}h${m%60 ? `${m%60}m` : ''}`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0', borderBottom: '1px solid #ECE8E0' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: '#FFF7ED', border: '1px solid #FDBA74',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
      }}>
        {tx.type_vehicule === 'moto' ? '🏍' : tx.type_vehicule === 'camion' ? '🚛' : '🚗'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: '#1C1917', lineHeight: 1 }}>{tx.plaque}</div>
        <div style={{ fontSize: 10, color: '#A8A29E', marginTop: 3 }}>
          <span style={{ color: '#78716C', fontWeight: 600 }}>{tx.place_code}</span>
          {' · '}
          <span style={{ color: ZC[tx.zone_code] ?? '#78716C', fontWeight: 600 }}>Zone {tx.zone_code}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#EA580C', fontFamily: "'Space Mono', monospace" }}>{dur}</div>
        <div style={{ fontSize: 10, color: '#D6D3D1', marginTop: 2 }}>
          {new Date(tx.entree_le).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
        </div>
      </div>
    </div>
  )
}

/* ── Mini map ────────────────────────────────────────────── */
function MiniMap({ places }) {
  if (!places.length) return <div className="skeleton" style={{ height: 90 }} />
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {places.map(p => {
        const occ = p.statut === 'occupe', hs = p.statut === 'hors_service'
        return (
          <div key={p.code} title={`${p.code}${occ ? ' — ' + p.plaque : ''}`} style={{
            width: 14, height: 14, borderRadius: 3,
            background: occ ? '#FEF2F2' : hs ? '#F7F4EF' : '#ECFDF5',
            border: `1px solid ${occ ? '#FECACA' : hs ? '#E2DDD3' : '#6EE7B7'}`,
            opacity: hs ? 0.4 : 1,
          }} />
        )
      })}
    </div>
  )
}

/* ── Dashboard ───────────────────────────────────────────── */
export default function Dashboard({ stats, zones, allPlaces, encours, alertes, onEntree, onSortie, onTabChange }) {
  const [showEntree, setShowEntree] = useState(false)

  const total    = stats?.total    ?? 0
  const libres   = stats?.libres   ?? 0
  const occupees = stats?.occupees ?? 0
  const taux     = parseFloat(stats?.taux_occupation ?? 0)
  const nbAlert  = alertes.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Welcome banner ─────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg,#1C0A00 0%,#7C2D12 55%,#EA580C 100%)',
        borderRadius: 12, padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        boxShadow: '0 8px 32px rgba(120,45,18,0.28)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -40, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
            SmartParking — Tableau de bord
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            {stats && ` · ${occupees} véhicule${occupees > 1 ? 's' : ''} stationné${occupees > 1 ? 's' : ''}`}
          </div>
        </div>
        <button onClick={() => setShowEntree(true)} style={{
          position: 'relative',
          padding: '9px 20px', borderRadius: 8,
          background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.15s',
          letterSpacing: '0.01em',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
        >
          ↑ Nouvelle entrée
        </button>
      </div>

      {/* ── KPIs ───────────────────────────────────────── */}
      <div className="g-kpi">
        {!stats ? [...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height: 96 }} />) : (<>
          <KCard val={libres}   label="Places libres"    sub={libres === 0 ? 'Complet' : libres <= 5 ? 'Presque plein' : `sur ${total}`}  color={libres === 0 ? 'red' : libres <= 5 ? 'amber' : 'green'} flash={libres === 0} icon="○" />
          <KCard val={occupees} label="Véhicules garés"  sub={`sur ${total} places`}                                                        color="sky"    icon="▲" onClick={() => onTabChange('vehicules')} />
          <KCard val={`${taux.toFixed(1)}%`} label="Taux occupation" sub={taux >= 90 ? 'Critique' : taux >= 75 ? 'Élevé' : 'Normal'}        color={taux >= 90 ? 'red' : taux >= 75 ? 'amber' : 'green'} flash={taux >= 90} icon="%" />
          <KCard val={nbAlert}  label="Alertes actives"  sub={nbAlert > 0 ? 'Attention requise' : 'Système OK'}                             color={nbAlert > 0 ? 'red' : 'green'} flash={nbAlert > 0} icon="⚡" onClick={nbAlert > 0 ? () => onTabChange('alertes') : undefined} />
        </>)}
      </div>

      {/* ── Row 2 ──────────────────────────────────────── */}
      <div className="g-dash">

        {/* Donut */}
        <div className="sp-card" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div className="section-title" style={{ margin: 0 }}>Occupation globale</div>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Donut pct={taux} />
            <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: taux >= 90 ? '#DC2626' : taux >= 75 ? '#D97706' : '#059669', fontFamily: "'Space Mono', monospace" }}>
                {taux.toFixed(0)}%
              </div>
              <div style={{ fontSize: 9.5, color: '#A8A29E', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>occupation</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {[{ n: libres, c: '#059669', l: 'Libres' }, { n: occupees, c: '#0284C7', l: 'Garés' }, { n: total, c: '#A8A29E', l: 'Total' }].map((x, i) => (
              <div key={x.l} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && <div style={{ width: 1, height: 24, background: '#E5DDD0', margin: '0 12px' }} />}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: x.c, fontFamily: "'Space Mono', monospace" }}>{x.n}</div>
                  <div style={{ fontSize: 9, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{x.l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-title">Zones en temps réel</div>
          {zones.length > 0 ? zones.map(z => <ZoneCard key={z.code} zone={z} />) :
            [...Array(3)].map((_,i) => <div key={i} className="skeleton" style={{ height: 76 }} />)}
        </div>

        {/* Quick actions */}
        <div className="sp-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div className="section-title">Actions rapides</div>

          <button onClick={() => setShowEntree(true)} className="sp-btn sp-btn-primary" style={{ width: '100%', padding: '11px', fontSize: 13, borderRadius: 9 }}>
            ↑ Nouvelle entrée
          </button>
          <button onClick={() => onTabChange('vehicules')} className="sp-btn sp-btn-danger" style={{ width: '100%', padding: '11px', fontSize: 13, borderRadius: 9 }}>
            ↓ Gérer les sorties
          </button>

          <div style={{ background: '#FAF8F3', border: '1px solid #E5DDD0', borderRadius: 8, padding: '12px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 9 }}>En ce moment</div>
            {[
              { label: 'Véhicules stationnés', val: occupees, c: '#0284C7' },
              { label: 'Alertes actives',      val: nbAlert,  c: nbAlert > 0 ? '#DC2626' : '#059669' },
              { label: 'Places disponibles',   val: libres,   c: libres === 0 ? '#DC2626' : '#059669' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#A8A29E', marginBottom: 6 }}>
                <span>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.c, fontFamily: "'Space Mono', monospace" }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3 ──────────────────────────────────────── */}
      <div className="g-dash2">

        {/* Activity */}
        <div className="sp-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="section-title" style={{ margin: 0 }}>Véhicules en cours</div>
            <button onClick={() => onTabChange('vehicules')} style={{ fontSize: 11, color: '#EA580C', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Voir tout →
            </button>
          </div>
          {encours.length === 0
            ? <div style={{ textAlign: 'center', padding: '24px 0', color: '#D6D3D1', fontSize: 12 }}>Aucun véhicule stationné</div>
            : <>
              {encours.slice(0, 7).map(tx => <ActivityRow key={tx.id} tx={tx} />)}
              {encours.length > 7 && <div style={{ fontSize: 11, color: '#A8A29E', textAlign: 'center', paddingTop: 10 }}>+ {encours.length - 7} autre{encours.length - 7 > 1 ? 's' : ''}</div>}
            </>
          }
        </div>

        {/* Mini map */}
        <div className="sp-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div className="section-title" style={{ margin: 0 }}>Vue d'ensemble — places</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#A8A29E' }}>
              {[['#6EE7B7','#ECFDF5','Libre'],['#FECACA','#FEF2F2','Occupé']].map(([bd,bg,l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: bg, border: `1px solid ${bd}`, display: 'inline-block' }} />{l}
                </span>
              ))}
            </div>
          </div>
          <MiniMap places={allPlaces} />
          <button onClick={() => onTabChange('parking')} className="sp-btn sp-btn-ghost" style={{ width: '100%', marginTop: 14, padding: '8px', borderRadius: 7, fontSize: 11 }}>
            Voir le plan complet →
          </button>
        </div>
      </div>

      {showEntree && <EntreeModal onClose={() => setShowEntree(false)} onSubmit={onEntree} />}
    </div>
  )
}
