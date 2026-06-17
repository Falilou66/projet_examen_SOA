import { useState } from 'react'

const TYPE_ICON  = { voiture: '🚗', moto: '🏍', camion: '🚛' }
const ZONE_STYLE = {
  A: { bg: 'rgba(37,99,235,0.08)',  c: '#1d4ed8', bd: '#bfdbfe' },
  B: { bg: 'rgba(109,40,217,0.08)', c: '#6d28d9', bd: '#ddd6fe' },
  C: { bg: 'rgba(180,83,9,0.08)',   c: '#b45309', bd: '#fde68a' },
}
const TARIFS = { voiture: 500, moto: 200, camion: 1000 }

function dureeStr(min) {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60), mn = m % 60
  return mn ? `${h}h ${mn}m` : `${h}h`
}

function coutEstime(tx) {
  const dur = (Date.now() - new Date(tx.entree_le)) / 60000
  return Math.round(Math.max(dur, 30) / 60 * (TARIFS[tx.type_vehicule] ?? 500))
}

/* ── Confirm modal ───────────────────────────────────────── */
function ConfirmModal({ tx, onConfirm, onCancel }) {
  if (!tx) return null
  const cout = coutEstime(tx)
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} className="animate-fadeup" style={{
        width: '100%', maxWidth: 360,
        background: '#ffffff', border: '1px solid #e2e8f0',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
      }}>
        <div style={{ padding: '22px 24px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            Confirmer la sortie
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            Enregistrer la sortie de{' '}
            <span style={{ color: '#0f172a', fontWeight: 700, fontFamily: 'monospace' }}>{tx.plaque}</span>
            {' '}depuis la place{' '}
            <span style={{ color: '#0f172a', fontWeight: 700 }}>{tx.place_code}</span> ?
          </p>
          <div style={{
            marginTop: 16, padding: '12px 14px', borderRadius: 10,
            background: '#f0fdf9', border: '1px solid #a7f3d0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Coût estimé</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                {cout.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
              {dureeStr(tx.duree_minutes_actuelle ?? 0)} de stationnement
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer',
          }}>
            Annuler
          </button>
          <button onClick={onConfirm} style={{
            padding: '8px 20px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: 'linear-gradient(135deg,#059669,#047857)',
            border: 'none', color: '#fff', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
          }}>
            Confirmer la sortie
          </button>
        </div>
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
  const field = key => ({ value: form[key], onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) })

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} className="animate-fadeup" style={{
        width: '100%', maxWidth: 420,
        background: '#ffffff', border: '1px solid #e2e8f0',
        borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '18px 22px 16px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#3730a3' }}>Enregistrer une entrée</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Attribution automatique de la place</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.1)',
            color: '#94a3b8', width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 22px' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Plaque</label>
            <input className="sp-input" type="text" placeholder="ex : DK-1234-A"
              style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}
              {...field('plaque')} />
          </div>
          <div className="modal-grid-2">
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Type</label>
              <select className="sp-input" {...field('type_vehicule')}>
                <option value="voiture">🚗 Voiture</option>
                <option value="moto">🏍 Moto</option>
                <option value="camion">🚛 Camion</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Zone</label>
              <select className="sp-input" {...field('zone')}>
                <option value="">Auto</option>
                <option value="A">Zone A</option>
                <option value="B">Zone B</option>
                <option value="C">Zone C</option>
              </select>
            </div>
          </div>
          {err && <div style={{ padding: '9px 12px', borderRadius: 9, marginBottom: 14, background: '#fef2f2', border: '1px solid #fecdd3', color: '#e11d48', fontSize: 12 }}>{err}</div>}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '10px', borderRadius: 11,
            background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
            border: 'none', color: loading ? '#94a3b8' : '#fff', fontSize: 13, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 14px rgba(79,70,229,0.35)',
          }}>
            {loading ? 'Enregistrement…' : '↑ Enregistrer l\'entrée'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ListeVehicules({ encours, onEntree, onSortie }) {
  const [loading, setLoading]       = useState(false)
  const [confirm, setConfirm]       = useState(null)
  const [showEntree, setShowEntree] = useState(false)

  const handleSortie = async () => {
    if (!confirm) return
    setLoading(true)
    setConfirm(null)
    await onSortie(confirm.id)
    setLoading(false)
  }

  if (!encours.length) {
    return (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', gap: 10 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#eef2ff', border: '1px solid #c7d2fe',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, marginBottom: 4,
          }}>🅿</div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#475569' }}>Parking vide</p>
          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Aucun véhicule en stationnement</p>
          <button onClick={() => setShowEntree(true)} style={{
            padding: '10px 24px', borderRadius: 11,
            background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
            border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
          }}>
            ↑ Nouvelle entrée
          </button>
        </div>
        {showEntree && <EntreeModal onClose={() => setShowEntree(false)} onSubmit={onEntree} />}
      </>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Véhicules garés</h2>
        <span style={{
          background: '#eef2ff', border: '1px solid #c7d2fe',
          color: '#4f46e5', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
        }}>
          {encours.length}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowEntree(true)} style={{
          padding: '7px 16px', borderRadius: 9,
          background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
          border: 'none', color: '#fff', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 3px 10px rgba(79,70,229,0.3)',
        }}>
          ↑ Nouvelle entrée
        </button>
      </div>

      <div className="sp-card sp-table-wrap">
        <table className="sp-table">
          <thead>
            <tr>
              {['Plaque', 'Type', 'Zone', 'Place', 'Entrée', 'Durée', 'Coût estimé', ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {encours.map(tx => {
              const duree = tx.duree_minutes_actuelle ?? 0
              const cout  = coutEstime(tx)
              const zs    = ZONE_STYLE[tx.zone_code] ?? { bg: '#f1f5f9', c: '#64748b', bd: '#e2e8f0' }
              return (
                <tr key={tx.id}>
                  <td>
                    <span style={{ fontFamily: 'SF Mono, monospace', fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                      {tx.plaque}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12 }}>
                      {TYPE_ICON[tx.type_vehicule] ?? '🚗'}
                      <span style={{ textTransform: 'capitalize' }}>{tx.type_vehicule}</span>
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                      background: zs.bg, color: zs.c, border: `1px solid ${zs.bd}`,
                    }}>
                      Zone {tx.zone_code}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5', fontSize: 13 }}>
                      {tx.place_code}
                    </span>
                  </td>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>
                    {new Date(tx.entree_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ color: '#475569', fontSize: 13, fontWeight: 500 }}>
                    {dureeStr(duree)}
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums',
                      color: cout > 1500 ? '#e11d48' : cout > 800 ? '#d97706' : '#059669',
                    }}>
                      {cout.toLocaleString('fr-FR')} F
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setConfirm(tx)}
                      disabled={loading}
                      style={{
                        background: '#fef2f2', border: '1px solid #fecdd3',
                        color: '#e11d48', fontSize: 11, fontWeight: 600,
                        padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                        whiteSpace: 'nowrap', opacity: loading ? 0.5 : 1,
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2' }}
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

      <ConfirmModal tx={confirm} onConfirm={handleSortie} onCancel={() => setConfirm(null)} />
      {showEntree && <EntreeModal onClose={() => setShowEntree(false)} onSubmit={onEntree} />}
    </div>
  )
}
