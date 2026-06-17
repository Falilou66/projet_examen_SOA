import { useState, useEffect } from 'react'
import DiagrammeInteractif from './DiagrammeInteractif'

/* ── Data ─────────────────────────────────────────────────── */
const CONTAINERS = [
  { name: 'sc-postgres',     image: 'postgres:16-alpine',    role: 'Base de données',   port: '5432',      color: '#336791', icon: '🐘', net: 'smartparking-net', cpu: 'faible' },
  { name: 'sc-places',       image: 'python:3.12-slim',      role: 'Service Places',    port: '8001',      color: '#0284C7', icon: '🅿', net: 'smartparking-net', cpu: 'faible' },
  { name: 'sc-transactions', image: 'python:3.12-slim',      role: 'Service Trans.',    port: '8002',      color: '#6d28d9', icon: '↕',  net: 'smartparking-net', cpu: 'moyen'  },
  { name: 'sc-reporting',    image: 'python:3.12-slim',      role: 'Service Reporting', port: '8003',      color: '#EA580C', icon: '∿',  net: 'smartparking-net', cpu: 'faible' },
  { name: 'sc-gateway',      image: 'nginx:alpine',          role: 'API Gateway',       port: '8090→80',   color: '#059669', icon: '⇌',  net: 'smartparking-net', cpu: 'faible' },
  { name: 'sc-simulateur',   image: 'php:8.3-cli-alpine',   role: 'Simulateur trafic', port: '—',         color: '#D97706', icon: '🔄', net: 'smartparking-net', cpu: 'faible' },
  { name: 'sc-dashboard',    image: 'nginx:alpine + node',   role: 'Dashboard React',   port: '3001→80',   color: '#1C1917', icon: '💻', net: 'smartparking-net', cpu: 'faible' },
]

const SERVICES = [
  {
    id: 'places', name: 'Service Places', port: 8001, color: '#0284C7', lt: '#F0F9FF', bd: '#BAE6FD', icon: '🅿',
    desc: 'Gestion des emplacements et des zones de parking. Source de vérité pour l\'état de chaque place.',
    tech: ['FastAPI', 'PostgreSQL', 'psycopg2'],
    schema: 'places',
    endpoints: [
      { method: 'GET',  path: '/health',               desc: 'État du service' },
      { method: 'GET',  path: '/stats',                desc: 'Statistiques globales (total, libres, occupées, taux)' },
      { method: 'GET',  path: '/zones',                desc: 'Liste des zones avec occupation en temps réel' },
      { method: 'GET',  path: '/places',               desc: 'Toutes les places (filtrage par zone/statut)' },
      { method: 'GET',  path: '/places/disponibles',   desc: 'Places libres uniquement' },
      { method: 'GET',  path: '/places/{code}',        desc: 'Détails d\'une place par son code' },
      { method: 'PUT',  path: '/places/{code}/occuper',desc: 'Marquer une place comme occupée' },
      { method: 'PUT',  path: '/places/{code}/liberer',desc: 'Libérer une place' },
      { method: 'GET',  path: '/docs',                 desc: 'Documentation Swagger interactive' },
    ],
  },
  {
    id: 'transactions', name: 'Service Transactions', port: 8002, color: '#6d28d9', lt: '#F5F3FF', bd: '#DDD6FE', icon: '↕',
    desc: 'Enregistrement des entrées/sorties, facturation au prorata et gestion des alertes de stationnement.',
    tech: ['FastAPI', 'PostgreSQL', 'httpx'],
    schema: 'transactions',
    depends: ['places'],
    endpoints: [
      { method: 'GET',  path: '/health',                    desc: 'État du service' },
      { method: 'POST', path: '/entree',                    desc: 'Enregistrer une entrée (attribue une place auto)' },
      { method: 'POST', path: '/sortie',                    desc: 'Enregistrer une sortie (calcule le montant)' },
      { method: 'GET',  path: '/encours',                   desc: 'Véhicules actuellement garés' },
      { method: 'GET',  path: '/transactions',              desc: 'Historique des transactions' },
      { method: 'GET',  path: '/alertes',                   desc: 'Alertes actives (taux critique, dépassements)' },
      { method: 'PUT',  path: '/alertes/{id}/resoudre',     desc: 'Marquer une alerte comme résolue' },
      { method: 'GET',  path: '/tarifs',                    desc: 'Grille tarifaire par type de véhicule' },
      { method: 'GET',  path: '/stats',                     desc: 'Statistiques des transactions' },
      { method: 'GET',  path: '/docs',                      desc: 'Documentation Swagger interactive' },
    ],
  },
  {
    id: 'reporting', name: 'Service Reporting', port: 8003, color: '#EA580C', lt: '#FFF7ED', bd: '#FDBA74', icon: '∿',
    desc: 'Agrégation des données des deux autres services pour produire rapports, statistiques et exports CSV.',
    tech: ['FastAPI', 'PostgreSQL', 'httpx', 'csv'],
    schema: 'reporting',
    depends: ['places', 'transactions'],
    endpoints: [
      { method: 'GET',  path: '/health',                     desc: 'État du service' },
      { method: 'GET',  path: '/rapport/occupation',         desc: 'Rapport d\'occupation par zone' },
      { method: 'GET',  path: '/rapport/revenus',            desc: 'Revenus par zone et type de véhicule' },
      { method: 'GET',  path: '/rapport/statistiques',       desc: 'Statistiques complètes (entrées, durée moy., etc.)' },
      { method: 'GET',  path: '/rapport/tendances',          desc: 'Fréquentation horaire sur 24h' },
      { method: 'GET',  path: '/rapport/export',             desc: 'Export CSV de toutes les transactions' },
      { method: 'GET',  path: '/docs',                       desc: 'Documentation Swagger interactive' },
    ],
  },
]

const DB_SCHEMAS = [
  {
    name: 'places', color: '#0284C7', icon: '🅿',
    tables: [
      { name: 'zones',  cols: ['code PK', 'nom', 'capacite', 'tarif_horaire', 'description'] },
      { name: 'places', cols: ['code PK', 'zone_code FK', 'type', 'statut', 'plaque', 'occupe_le', 'libere_le'] },
    ],
  },
  {
    name: 'transactions', color: '#6d28d9', icon: '↕',
    tables: [
      { name: 'transactions', cols: ['id PK', 'plaque', 'place_code FK', 'zone_code', 'type_vehicule', 'entree_le', 'sortie_le', 'duree_minutes', 'montant_fcfa', 'statut'] },
      { name: 'alertes',      cols: ['id PK', 'type', 'message', 'zone_code', 'place_code', 'severite', 'statut', 'cree_le', 'resolue_le'] },
      { name: 'tarifs',       cols: ['id PK', 'type_vehicule', 'tarif_horaire', 'tarif_minimum'] },
    ],
  },
  {
    name: 'reporting', color: '#EA580C', icon: '∿',
    tables: [
      { name: 'rapports_journaliers', cols: ['id PK', 'date', 'nb_entrees', 'nb_sorties', 'revenus_fcfa', 'taux_occupation_moyen', 'cree_le'] },
    ],
  },
]

const FLOW_STEPS = [
  { id: 1, actor: 'Agent',     action: 'Scanne la plaque', icon: '📷', color: '#EA580C' },
  { id: 2, actor: 'Dashboard', action: 'POST /entree', icon: '💻', color: '#1C1917' },
  { id: 3, actor: 'Gateway',   action: 'Route → :8002', icon: '⇌', color: '#059669' },
  { id: 4, actor: 'Transactions', action: 'Valide & cherche place', icon: '↕', color: '#6d28d9' },
  { id: 5, actor: 'Places',    action: 'Attribue & verrouille', icon: '🅿', color: '#0284C7' },
  { id: 6, actor: 'DB',        action: 'INSERT transaction', icon: '🐘', color: '#336791' },
  { id: 7, actor: 'Agent',     action: 'Reçoit confirmation', icon: '✓', color: '#059669' },
]

const METHOD_COLOR = {
  GET:  { bg: '#EFF6FF', c: '#1D4ED8', bd: '#BFDBFE' },
  POST: { bg: '#F0FDF4', c: '#166534', bd: '#86EFAC' },
  PUT:  { bg: '#FFFBEB', c: '#92400E', bd: '#FDE68A' },
}

/* ── Sub-components ───────────────────────────────────────── */
function Badge({ method }) {
  const s = METHOD_COLOR[method] ?? { bg: '#F1F5F9', c: '#475569', bd: '#CBD5E1' }
  return (
    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: s.bg, color: s.c, border: `1px solid ${s.bd}`, fontFamily: 'monospace', flexShrink: 0 }}>
      {method}
    </span>
  )
}

/* ── Section 1: Architecture Diagram ─────────────────────── */
function ArchDiagram({ onSelectLayer }) {
  const [hovered, setHovered] = useState(null)

  const layers = [
    {
      id: 'client', label: 'Clients', bg: '#1C1917', items: [
        { icon: '🌐', name: 'Navigateur Web', sub: 'http://localhost:3001' },
        { icon: '📱', name: 'Mobile (Flutter)', sub: 'à venir' },
      ],
    },
    {
      id: 'dashboard', label: 'Dashboard', bg: '#1C3A4A', items: [
        { icon: '⚛', name: 'React 18 + Vite', sub: 'SPA — port 3001' },
        { icon: '🔒', name: 'Auth localStorage', sub: 'sessions navigateur' },
      ],
    },
    {
      id: 'gateway', label: 'API Gateway', bg: '#14532D', items: [
        { icon: '⇌', name: 'Nginx reverse proxy', sub: 'port 8090 — /api/*' },
      ],
    },
    {
      id: 'services', label: 'Microservices', bg: '#2D1B4A', items: [
        { icon: '🅿', name: 'Places :8001', sub: 'FastAPI Python' },
        { icon: '↕', name: 'Transactions :8002', sub: 'FastAPI Python' },
        { icon: '∿', name: 'Reporting :8003', sub: 'FastAPI Python' },
      ],
    },
    {
      id: 'data', label: 'Données', bg: '#1A2B3C', items: [
        { icon: '🐘', name: 'PostgreSQL 16', sub: 'port 5432 — 3 schémas' },
      ],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {layers.map((layer, li) => (
        <div key={layer.id}>
          <div
            onClick={() => onSelectLayer(layer.id)}
            style={{
              borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
              border: `1.5px solid ${hovered === layer.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
              transition: 'all 0.18s',
              transform: hovered === layer.id ? 'translateX(4px)' : '',
              boxShadow: hovered === layer.id ? '0 4px 20px rgba(0,0,0,0.25)' : '',
            }}
            onMouseEnter={() => setHovered(layer.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ background: layer.bg, padding: '10px 16px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                {layer.label}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {layer.items.map(item => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{item.name}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', fontFamily: 'monospace' }}>{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {li < layers.length - 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 22, gap: 6 }}>
              <div style={{ width: 1, height: '100%', background: 'rgba(234,88,12,0.35)' }} />
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#EA580C', marginTop: 'auto' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Section 2: Containers grid ──────────────────────────── */
function ContainerCard({ c, healthMap }) {
  const running = healthMap[c.name] !== false
  return (
    <div className="sp-card" style={{ padding: '14px 16px', borderLeft: `3px solid ${c.color}`, borderRadius: '0 8px 8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, color: '#fff' }}>{c.icon}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1C1917', fontFamily: 'monospace' }}>{c.name}</div>
            <div style={{ fontSize: 10, color: '#A8A29E', marginTop: 2 }}>{c.role}</div>
          </div>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: running ? '#ECFDF5' : '#FEF2F2', color: running ? '#059669' : '#DC2626', border: `1px solid ${running ? '#6EE7B7' : '#FECACA'}` }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: running ? '#059669' : '#DC2626', display: 'inline-block' }} />
          {running ? 'UP' : 'DOWN'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[
          ['Image',  c.image],
          ['Port',   c.port],
          ['Réseau', c.net],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
            <span style={{ color: '#A8A29E' }}>{k}</span>
            <span style={{ color: '#44403C', fontWeight: 600, fontFamily: 'monospace', textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Section 3: Service accordion ────────────────────────── */
function ServiceAccordion({ svc }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius: 12, border: `1.5px solid ${open ? svc.bd : '#E2DDD3'}`, overflow: 'hidden', transition: 'border-color 0.15s', marginBottom: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '16px 18px', background: open ? svc.lt : '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', transition: 'background 0.15s', fontFamily: 'inherit' }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 9, background: svc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', flexShrink: 0 }}>{svc.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1917' }}>{svc.name}</div>
          <div style={{ fontSize: 11, color: '#78716C', marginTop: 2 }}>:{svc.port} · {svc.endpoints.length} endpoints · schema: {svc.schema}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {svc.tech.slice(0, 2).map(t => (
            <span key={t} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: svc.lt, color: svc.color, border: `1px solid ${svc.bd}` }}>{t}</span>
          ))}
        </div>
        <span style={{ fontSize: 14, color: svc.color, marginLeft: 4, transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : '' }}>▾</span>
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${svc.bd}`, background: '#FAFAFA' }}>
          <div style={{ padding: '14px 18px 6px', fontSize: 12, color: '#78716C', lineHeight: 1.6, borderBottom: '1px solid #F0EDE8' }}>
            {svc.desc}
            {svc.depends && (
              <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#FFF7ED', color: '#EA580C', border: '1px solid #FDBA74' }}>
                Dépend de : {svc.depends.join(', ')}
              </span>
            )}
          </div>
          <div style={{ padding: '10px 18px 14px' }}>
            {svc.endpoints.map(ep => (
              <div key={ep.path} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px dashed #EDE8E0' }}>
                <Badge method={ep.method} />
                <code style={{ fontSize: 11, fontWeight: 700, color: svc.color, fontFamily: 'monospace', flexShrink: 0 }}>{ep.path}</code>
                <span style={{ fontSize: 11, color: '#A8A29E', flex: 1 }}>{ep.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Section 4: DB Schema ─────────────────────────────────── */
function SchemaViewer() {
  const [active, setActive] = useState('places')
  const schema = DB_SCHEMAS.find(s => s.name === active)
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {DB_SCHEMAS.map(s => (
          <button key={s.name} onClick={() => setActive(s.name)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.14s', fontFamily: 'inherit',
            background: active === s.name ? s.color : '#F3F1EC',
            color:      active === s.name ? '#fff'    : '#78716C',
            boxShadow:  active === s.name ? `0 3px 10px ${s.color}40` : '',
          }}>
            {s.icon} schema_{s.name}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {schema.tables.map(t => (
          <div key={t.name} style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${schema.color}30`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ background: schema.color, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>TABLE</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{t.name}</span>
            </div>
            <div style={{ background: '#fff', padding: '8px 0' }}>
              {t.cols.map(col => {
                const isPK = col.includes('PK'), isFK = col.includes('FK')
                return (
                  <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 14px' }}>
                    {isPK && <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 3, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>PK</span>}
                    {isFK && <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 3, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>FK</span>}
                    {!isPK && !isFK && <span style={{ width: 24 }} />}
                    <span style={{ fontSize: 11, color: '#44403C', fontFamily: 'monospace' }}>{col.replace(' PK', '').replace(' FK', '')}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Section 5: Request Flow ──────────────────────────────── */
function RequestFlow() {
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    if (step >= FLOW_STEPS.length) { setRunning(false); return }
    const t = setTimeout(() => setStep(s => s + 1), 700)
    return () => clearTimeout(t)
  }, [running, step])

  const start = () => { setStep(0); setRunning(true) }
  const reset = () => { setStep(0); setRunning(false) }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={start} disabled={running} className="sp-btn sp-btn-primary" style={{ padding: '8px 20px', fontSize: 12, opacity: running ? 0.6 : 1 }}>
          {running ? '⏳ Simulation en cours…' : '▶ Simuler une entrée véhicule'}
        </button>
        {step > 0 && !running && (
          <button onClick={reset} className="sp-btn sp-btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>↺ Recommencer</button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {FLOW_STEPS.map((s, i) => {
          const active  = step === i + 1
          const done    = step > i + 1
          const pending = step <= i
          return (
            <div key={s.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {/* Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: done ? s.color : active ? s.color : '#F3F1EC',
                  border: `2px solid ${done || active ? s.color : '#E2DDD3'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: done ? 14 : 16,
                  transition: 'all 0.3s',
                  boxShadow: active ? `0 0 0 4px ${s.color}25` : '',
                }}>
                  {done ? <span style={{ fontSize: 13 }}>✓</span> : <span>{s.icon}</span>}
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 24, background: done ? s.color : '#E2DDD3', transition: 'background 0.3s', margin: '3px 0' }} />
                )}
              </div>
              {/* Content */}
              <div style={{
                flex: 1, paddingBottom: 20,
                opacity: pending ? 0.35 : 1,
                transition: 'opacity 0.3s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.actor}</span>
                  {active && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: s.color, color: '#fff', animation: 'fadeup 0.3s ease' }}>
                      EN COURS
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1917', fontFamily: done || active ? 'inherit' : 'inherit' }}>
                  {s.action}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {step >= FLOW_STEPS.length && !running && (
        <div className="animate-fadeup" style={{ marginTop: 8, padding: '12px 16px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #6EE7B7', fontSize: 12, fontWeight: 600, color: '#065F46', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>✓</span> Entrée enregistrée avec succès ! La transaction est persistée en base et la place est marquée occupée.
        </div>
      )}
    </div>
  )
}

/* ── Main component ───────────────────────────────────────── */
export default function ArchitecturePage() {
  const [healthMap, setHealthMap] = useState({})
  const [selectedLayer, setSelectedLayer] = useState(null)
  const [activeSection, setActiveSection] = useState('schema3d')

  useEffect(() => {
    const check = async () => {
      const results = {}
      await Promise.allSettled([
        fetch('/api/places/health').then(r => { results['sc-places'] = r.ok }),
        fetch('/api/transactions/health').then(r => { results['sc-transactions'] = r.ok }),
        fetch('/api/reporting/health').then(r => { results['sc-reporting'] = r.ok }),
        fetch('/api/registry').then(r => { results['sc-gateway'] = r.ok }),
      ])
      results['sc-postgres']   = results['sc-places'] ?? false
      results['sc-dashboard']  = true
      results['sc-simulateur'] = results['sc-transactions'] ?? false
      setHealthMap(results)
    }
    check()
    const t = setInterval(check, 10000)
    return () => clearInterval(t)
  }, [])

  const sections = [
    { id: 'schema3d',   label: 'Schéma interactif', icon: '✦' },
    { id: 'diagram',    label: 'Vue globale',        icon: '🏗' },
    { id: 'containers', label: 'Conteneurs',          icon: '🐳' },
    { id: 'services',   label: 'Services API',        icon: '⚡' },
    { id: 'database',   label: 'Base de données',     icon: '🐘' },
    { id: 'flow',       label: 'Flux de données',     icon: '▶' },
  ]

  const upCount = Object.values(healthMap).filter(Boolean).length

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#1C1917', letterSpacing: '-0.4px' }}>
              Architecture SmartParking
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: '#78716C', lineHeight: 1.5 }}>
              Plateforme SOA · 3 microservices Python · API Gateway Nginx · PostgreSQL 16 · React 18 · Docker
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ padding: '6px 14px', borderRadius: 20, background: upCount >= 3 ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${upCount >= 3 ? '#6EE7B7' : '#FECACA'}`, fontSize: 11, fontWeight: 700, color: upCount >= 3 ? '#059669' : '#DC2626', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: upCount >= 3 ? '#059669' : '#DC2626', display: 'inline-block' }} className={upCount >= 3 ? 'animate-live' : ''} />
              {upCount} / 7 conteneurs actifs
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#F3F1EC', borderRadius: 12, padding: 5, flexWrap: 'wrap', border: '1px solid #E2DDD3' }}>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              flex: '1 1 auto', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
              background: activeSection === s.id ? '#fff' : 'transparent',
              color:      activeSection === s.id ? '#EA580C' : '#78716C',
              boxShadow:  activeSection === s.id ? '0 1px 4px rgba(0,0,0,0.1)' : '',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ marginRight: 5 }}>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      {/* ── Schéma interactif 3D ──────────────────────────── */}
      {activeSection === 'schema3d' && (
        <div className="animate-fadeup">
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#EA580C,#F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', boxShadow: '0 3px 10px rgba(234,88,12,0.35)' }}>✦</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1C1917', letterSpacing: '-0.3px' }}>Schéma SOA interactif</div>
                <div style={{ fontSize: 11, color: '#A8A29E' }}>Tilt 3D · paquets animés · cliquer sur les nœuds · simuler les flux</div>
              </div>
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2DDD3', padding: '20px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <DiagrammeInteractif />
          </div>
        </div>
      )}

      {/* ── Vue globale ────────────────────────────────────── */}
      {activeSection === 'diagram' && (
        <div className="g-dash2 animate-fadeup">
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Couches architecturales — cliquer pour explorer
            </div>
            <ArchDiagram onSelectLayer={setSelectedLayer} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sp-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Principes SOA appliqués</div>
              {[
                { t: 'Couplage faible', d: 'Chaque service communique uniquement via HTTP REST. Aucune dépendance directe au code des autres.', c: '#EA580C' },
                { t: 'Contrat d\'interface', d: 'Chaque service expose une documentation Swagger auto-générée (/docs).', c: '#0284C7' },
                { t: 'Indépendance des données', d: 'Chaque service possède son propre schéma PostgreSQL isolé.', c: '#059669' },
                { t: 'Découvrabilité', d: 'La gateway expose un registre JSON (/api/registry) listant tous les services.', c: '#6d28d9' },
              ].map(p => (
                <div key={p.t} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: p.c, marginTop: 7, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1C1917', marginBottom: 2 }}>{p.t}</div>
                    <div style={{ fontSize: 11, color: '#78716C', lineHeight: 1.5 }}>{p.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sp-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Stack technique</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {[
                  ['Python 3.12', '#3776AB'], ['FastAPI', '#009688'], ['PostgreSQL 16', '#336791'],
                  ['React 18', '#61DAFB'], ['Vite 5', '#646CFF'], ['Nginx', '#009639'],
                  ['Docker', '#2496ED'], ['PHP 8.3', '#777BB4'],
                ].map(([t, c]) => (
                  <span key={t} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: c + '15', color: c, border: `1px solid ${c}30` }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Conteneurs ─────────────────────────────────────── */}
      {activeSection === 'containers' && (
        <div className="animate-fadeup">
          <div style={{ fontSize: 10, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            7 conteneurs Docker · réseau bridge <code style={{ fontFamily: 'monospace', background: '#F3F1EC', padding: '1px 6px', borderRadius: 4 }}>smartparking-net</code>
          </div>
          <div className="g-3" style={{ gap: 12 }}>
            {CONTAINERS.map(c => <ContainerCard key={c.name} c={c} healthMap={healthMap} />)}
          </div>
          <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 10, background: '#F3F1EC', border: '1px solid #E2DDD3', fontSize: 12, color: '#78716C', lineHeight: 1.6 }}>
            <strong style={{ color: '#1C1917' }}>Volume persistant :</strong> <code style={{ fontFamily: 'monospace', background: '#fff', padding: '1px 6px', borderRadius: 4 }}>postgres-data</code> — les données PostgreSQL survivent aux redémarrages des conteneurs. <br />
            <strong style={{ color: '#1C1917' }}>Build multi-stage :</strong> le dashboard utilise node:20 pour compiler React, puis nginx:alpine pour servir les assets statiques, réduisant l'image finale.
          </div>
        </div>
      )}

      {/* ── Services API ───────────────────────────────────── */}
      {activeSection === 'services' && (
        <div className="animate-fadeup">
          <div style={{ fontSize: 10, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            3 microservices FastAPI · {SERVICES.reduce((a, s) => a + s.endpoints.length, 0)} endpoints au total
          </div>
          {SERVICES.map(svc => <ServiceAccordion key={svc.id} svc={svc} />)}
          <div style={{ padding: '14px 18px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FDBA74', fontSize: 12, color: '#78716C', marginTop: 8 }}>
            <strong style={{ color: '#9A3412' }}>Convention d\'URL Gateway :</strong> toutes les requêtes transitent par <code style={{ fontFamily: 'monospace' }}>http://localhost:8090/api/{'{service}'}/{'{endpoint}'}</code> — Nginx rewrite le chemin avant de forwarder au service interne.
          </div>
        </div>
      )}

      {/* ── Database ───────────────────────────────────────── */}
      {activeSection === 'database' && (
        <div className="animate-fadeup">
          <div style={{ fontSize: 10, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            1 base PostgreSQL 16 · 3 schémas isolés · 5 tables
          </div>
          <SchemaViewer />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '14px 18px', borderRadius: 10, background: '#F0F9FF', border: '1px solid #BAE6FD', fontSize: 12, color: '#44403C', lineHeight: 1.6 }}>
              <strong style={{ color: '#0C4A6E' }}>Isolation par schéma :</strong> chaque service utilise un utilisateur PostgreSQL distinct (<code>svc_places</code>, <code>svc_transactions</code>, <code>svc_reporting</code>) avec accès limité à son propre schéma — principe du moindre privilège.
            </div>
            <div style={{ padding: '14px 18px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #6EE7B7', fontSize: 12, color: '#44403C', lineHeight: 1.6 }}>
              <strong style={{ color: '#14532D' }}>Init automatique :</strong> le fichier <code>database/init.sql</code> est monté dans le conteneur PostgreSQL. Il crée les schémas, tables, index, utilisateurs et injecte les données de démarrage (45 places, 3 zones, grille tarifaire) au premier démarrage.
            </div>
          </div>
        </div>
      )}

      {/* ── Flux de données ────────────────────────────────── */}
      {activeSection === 'flow' && (
        <div className="animate-fadeup">
          <div style={{ fontSize: 10, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            Simulation du flux — entrée d'un véhicule
          </div>
          <div className="g-dash2">
            <div className="sp-card" style={{ padding: '20px' }}>
              <RequestFlow />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="sp-card" style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Flux de sortie</div>
                {[
                  { icon: '💻', actor: 'Dashboard', action: 'POST /sortie · {transaction_id}' },
                  { icon: '⇌', actor: 'Gateway', action: 'Route → sc-transactions:8002' },
                  { icon: '↕', actor: 'Transactions', action: 'Calcule durée & montant' },
                  { icon: '🅿', actor: 'Places', action: 'Libère la place (PUT /liberer)' },
                  { icon: '🐘', actor: 'PostgreSQL', action: 'UPDATE transaction · INSERT reporting' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px dashed #EDE8E0', fontSize: 11, color: '#78716C' }}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{s.icon}</span>
                    <span style={{ fontWeight: 600, color: '#44403C', minWidth: 80 }}>{s.actor}</span>
                    <code style={{ fontSize: 10, fontFamily: 'monospace' }}>{s.action}</code>
                  </div>
                ))}
              </div>

              <div className="sp-card" style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Simulateur automatique</div>
                <p style={{ margin: 0, fontSize: 12, color: '#78716C', lineHeight: 1.6 }}>
                  Le conteneur <code style={{ fontFamily: 'monospace', background: '#F3F1EC', padding: '1px 5px', borderRadius: 3 }}>sc-simulateur</code> (PHP) génère automatiquement du trafic toutes les <strong>5 secondes</strong> — entrées et sorties aléatoires — pour simuler l'activité du parking et alimenter les statistiques en temps réel.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
