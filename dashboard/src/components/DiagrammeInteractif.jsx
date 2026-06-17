import { useState, useRef, useEffect, useCallback } from 'react'

/* ── Coordonnées du diagramme (viewBox 1000×590) ────────────
   Chaque nœud : cx, cy = centre ; w, h = dimensions         */
const VW = 1000, VH = 590

const NODES = {
  browser:   { cx:185, cy:55,  w:120, h:50, label:'Navigateur\nWeb',      icon:'🌐', color:'#374151', lt:'#F9FAFB', type:'client'   },
  mobile:    { cx:735, cy:55,  w:120, h:50, label:'App Mobile\n(Flutter)', icon:'📱', color:'#374151', lt:'#F9FAFB', type:'client'   },
  dashboard: { cx:460, cy:170, w:150, h:55, label:'Dashboard React',       icon:'⚛',  color:'#4338CA', lt:'#EEF2FF', type:'frontend' },
  gateway:   { cx:460, cy:285, w:150, h:55, label:'API Gateway\n(Nginx)',  icon:'⇌',  color:'#059669', lt:'#ECFDF5', type:'gateway'  },
  simul:     { cx:828, cy:285, w:138, h:50, label:'Simulateur\n(PHP CLI)', icon:'🔄', color:'#D97706', lt:'#FFFBEB', type:'external' },
  places:    { cx:195, cy:415, w:138, h:55, label:'Svc Places\n:8001',     icon:'🅿', color:'#0284C7', lt:'#F0F9FF', type:'service'  },
  trans:     { cx:460, cy:415, w:150, h:55, label:'Svc Transactions\n:8002',icon:'↕', color:'#6d28d9', lt:'#F5F3FF', type:'service'  },
  report:    { cx:725, cy:415, w:138, h:55, label:'Svc Reporting\n:8003',  icon:'∿',  color:'#EA580C', lt:'#FFF7ED', type:'service'  },
  db:        { cx:460, cy:530, w:160, h:55, label:'PostgreSQL 16\n3 schémas', icon:'🐘', color:'#336791', lt:'#EFF6FF', type:'database' },
}

/* Bords d'un nœud */
const top    = n => ({ x: n.cx,          y: n.cy - n.h/2 })
const bottom = n => ({ x: n.cx,          y: n.cy + n.h/2 })
const left   = n => ({ x: n.cx - n.w/2,  y: n.cy })
const right  = n => ({ x: n.cx + n.w/2,  y: n.cy })

/* ── Connexions ─────────────────────────────────────────── */
const CONNS = [
  { id:'c1',  from:'browser',   to:'dashboard', label:'HTTP',             color:'#4338CA', dur:2.2, begin:0,    path: () => { const s=bottom(NODES.browser),  t=top(NODES.dashboard);  return `M${s.x},${s.y} C${s.x},${s.y+50} ${t.x},${t.y-50} ${t.x},${t.y}` } },
  { id:'c2',  from:'mobile',    to:'dashboard', label:'HTTP',             color:'#4338CA', dur:2.2, begin:0.4,  path: () => { const s=bottom(NODES.mobile),    t=top(NODES.dashboard);  return `M${s.x},${s.y} C${s.x},${s.y+50} ${t.x},${t.y-50} ${t.x},${t.y}` } },
  { id:'c3',  from:'dashboard', to:'gateway',   label:'/api/*',           color:'#059669', dur:1.5, begin:0,    path: () => { const s=bottom(NODES.dashboard), t=top(NODES.gateway);    return `M${s.x},${s.y} L${t.x},${t.y}` } },
  { id:'c4',  from:'simul',     to:'gateway',   label:'POST /entree',     color:'#D97706', dur:2.0, begin:0.7,  path: () => { const s=left(NODES.simul),       t=right(NODES.gateway);  return `M${s.x},${s.y} L${t.x},${t.y}` } },
  { id:'c5',  from:'gateway',   to:'places',    label:'/places/',         color:'#0284C7', dur:1.8, begin:0.2,  path: () => { const s=bottom(NODES.gateway),   t=top(NODES.places);     return `M${s.x-30},${s.y} C${s.x-60},${s.y+60} ${t.x+40},${t.y-40} ${t.x},${t.y}` } },
  { id:'c6',  from:'gateway',   to:'trans',     label:'/transactions/',   color:'#6d28d9', dur:1.5, begin:0,    path: () => { const s=bottom(NODES.gateway),   t=top(NODES.trans);      return `M${s.x},${s.y} L${t.x},${t.y}` } },
  { id:'c7',  from:'gateway',   to:'report',    label:'/reporting/',      color:'#EA580C', dur:1.8, begin:0.5,  path: () => { const s=bottom(NODES.gateway),   t=top(NODES.report);     return `M${s.x+30},${s.y} C${s.x+60},${s.y+60} ${t.x-40},${t.y-40} ${t.x},${t.y}` } },
  { id:'c8',  from:'trans',     to:'places',    label:'GET /disponibles', color:'#0284C7', dur:1.6, begin:0.9,  path: () => { const s=left(NODES.trans),       t=right(NODES.places);   return `M${s.x},${s.y} L${t.x},${t.y}` } },
  { id:'c9',  from:'places',    to:'db',        label:'SQL',              color:'#336791', dur:1.4, begin:0.3,  path: () => { const s=bottom(NODES.places),    t=left(NODES.db);        return `M${s.x},${s.y} C${s.x},${s.y+50} ${t.x-30},${t.y} ${t.x},${t.y}` } },
  { id:'c10', from:'trans',     to:'db',        label:'SQL',              color:'#336791', dur:1.4, begin:0,    path: () => { const s=bottom(NODES.trans),     t=top(NODES.db);         return `M${s.x},${s.y} L${t.x},${t.y}` } },
  { id:'c11', from:'report',    to:'db',        label:'SQL',              color:'#336791', dur:1.4, begin:0.6,  path: () => { const s=bottom(NODES.report),    t=right(NODES.db);       return `M${s.x},${s.y} C${s.x},${s.y+50} ${t.x+30},${t.y} ${t.x},${t.y}` } },
]

/* ── Scénarios de flux ──────────────────────────────────── */
const SCENARIOS = {
  entree: {
    label: 'Entrée véhicule',  icon: '🚗', color: '#EA580C',
    steps: [
      { conn:'c3', node:'dashboard', msg:'Agent saisit la plaque "DK-1234-A" dans le dashboard' },
      { conn:'c6', node:'gateway',   msg:'Dashboard → POST /api/transactions/entree' },
      { conn:'c8', node:'trans',     msg:'Service Transactions → GET /places/disponibles (Zone A)' },
      { conn:'c5', node:'places',    msg:'Service Places retourne une place libre' },
      { conn:'c9', node:'places',    msg:'PUT /places/A-07/occuper → place verrouillée' },
      { conn:'c10',node:'trans',     msg:'INSERT INTO transactions.transactions — place A-07 attribuée' },
    ],
  },
  sortie: {
    label: 'Sortie & paiement', icon: '✓', color: '#059669',
    steps: [
      { conn:'c3', node:'dashboard', msg:'Agent clique "Sortie" sur la transaction en cours' },
      { conn:'c6', node:'gateway',   msg:'Dashboard → POST /api/transactions/sortie {transaction_id}' },
      { conn:'c10',node:'trans',     msg:'Calcule durée (90 min) × tarif (500 F/h) = 750 FCFA' },
      { conn:'c5', node:'places',    msg:'PUT /places/A-07/liberer → place libérée' },
      { conn:'c11',node:'report',    msg:'Données agrégées dans reporting.rapports_journaliers' },
    ],
  },
  stats: {
    label: 'Consultation stats', icon: '📊', color: '#0284C7',
    steps: [
      { conn:'c3', node:'dashboard', msg:'Agent ouvre l\'onglet Statistiques' },
      { conn:'c7', node:'gateway',   msg:'Dashboard → GET /api/reporting/rapport/revenus?periode=aujourd_hui' },
      { conn:'c11',node:'report',    msg:'Service Reporting agrège les données des 3 schémas PostgreSQL' },
      { conn:'c10',node:'db',        msg:'SELECT SUM(montant_fcfa), COUNT(*) FROM transactions.transactions…' },
    ],
  },
}

const NODE_DETAILS = {
  browser:   { role:'Consommateur',  tech:'Chrome / Firefox',      desc:'Accède au dashboard via HTTP :3001. Ne connaît que l\'URL de la Gateway, jamais les services internes.' },
  mobile:    { role:'Consommateur',  tech:'Flutter (planifié)',     desc:'Future application mobile. Consommerait les mêmes endpoints REST via la Gateway sans modification des services.' },
  dashboard: { role:'Consommateur',  tech:'React 18 + Vite · Nginx :3001', desc:'SPA multi-pages. Polling toutes les 5s. Auth localStorage. Appelle exclusivement /api/* sur la Gateway.' },
  gateway:   { role:'Bus de services', tech:'Nginx Alpine · port 8090', desc:'Unique point d\'entrée. Rewrite d\'URL, proxy vers le bon service, registre SOA JSON sur /api/registry.' },
  simul:     { role:'Producteur',    tech:'PHP 8.3 CLI Alpine',    desc:'Génère entrées/sorties aléatoires toutes les 5s. Logique pondérée : 55% entrée / 45% sortie. 20 plaques sénégalaises.' },
  places:    { role:'Fournisseur',   tech:'FastAPI Python · port 8001', desc:'Source de vérité pour les places. 9 endpoints. Schéma PostgreSQL isolé. Consommé par Transactions et Dashboard.' },
  trans:     { role:'Fournisseur + Orchestrateur', tech:'FastAPI Python · port 8002', desc:'Compose le Service Places pour attribuer les places. Gère la facturation et les alertes. 10 endpoints.' },
  report:    { role:'Fournisseur',   tech:'FastAPI Python · port 8003', desc:'Agrège les données des deux autres schémas. Export CSV. 6 endpoints. Lit transactions et places en lecture seule.' },
  db:        { role:'Persistance',   tech:'PostgreSQL 16 Alpine · port 5432', desc:'3 schémas logiques isolés (places, transactions, reporting). 1 utilisateur par schéma. Volume Docker persistant.' },
}

const TYPE_LABEL = { client:'CLIENT', frontend:'FRONTEND', gateway:'GATEWAY', service:'SERVICE', external:'PRODUCTEUR', database:'BASE DE DONNÉES' }
const TYPE_COLOR = { client:'#64748B', frontend:'#4338CA', gateway:'#059669', service:'#EA580C', external:'#D97706', database:'#336791' }

/* ── Composant nœud SVG ─────────────────────────────────── */
function SvgNode({ id, node, selected, highlighted, onClick, scale }) {
  const [hov, setHov] = useState(false)
  const active = selected === id
  const hl     = highlighted.has(id)
  const x = node.cx - node.w/2
  const y = node.cy - node.h/2
  const glowColor = node.color + '55'

  return (
    <g
      style={{ cursor:'pointer' }}
      onClick={() => onClick(id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Glow */}
      {(active || hl || hov) && (
        <rect
          x={x-6} y={y-6} width={node.w+12} height={node.h+12}
          rx={16} ry={16}
          fill={active ? node.color+'22' : glowColor}
          stroke={node.color}
          strokeWidth={active ? 2 : 1}
          opacity={0.8}
        />
      )}
      {/* Card shadow */}
      <rect x={x+3} y={y+4} width={node.w} height={node.h} rx={12} ry={12} fill="rgba(0,0,0,0.12)" />
      {/* Card bg */}
      <rect
        x={x} y={y} width={node.w} height={node.h}
        rx={12} ry={12}
        fill={active ? node.lt : (hov ? node.lt : '#FFFFFF')}
        stroke={active || hl ? node.color : (hov ? node.color+'80' : '#E2DDD3')}
        strokeWidth={active ? 2 : 1}
      />
      {/* Left accent */}
      <rect x={x} y={y+10} width={3} height={node.h-20} rx={2} ry={2} fill={node.color} />
      {/* Icon bg */}
      <rect x={x+10} y={y+10} width={30} height={30} rx={8} ry={8} fill={node.color+'18'} />
      {/* Icon */}
      <text x={x+25} y={y+30} textAnchor="middle" dominantBaseline="middle" fontSize={15}>{node.icon}</text>
      {/* Label */}
      {node.label.split('\n').map((line, i) => (
        <text
          key={i}
          x={x+47} y={node.label.includes('\n') ? y+node.h/2-5+i*14 : y+node.h/2}
          dominantBaseline="middle"
          fontSize={10.5}
          fontWeight={active ? 700 : 600}
          fill={active ? node.color : '#1C1917'}
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        >{line}</text>
      ))}
      {/* Active pulse ring */}
      {hl && (
        <rect x={x-3} y={y-3} width={node.w+6} height={node.h+6} rx={14} ry={14}
          fill="none" stroke={node.color} strokeWidth={1.5} opacity={0.5}
          style={{ animation:'live 1.5s ease-in-out infinite' }}
        />
      )}
    </g>
  )
}

/* ── Composant principal ─────────────────────────────────── */
export default function DiagrammeInteractif() {
  const wrapRef  = useRef(null)
  const [tilt,   setTilt]   = useState({ x:0, y:0 })
  const [selected, setSelected] = useState(null)
  const [scenario, setScenario] = useState(null)
  const [step,    setStep]   = useState(-1)
  const [running, setRunning] = useState(false)
  const [highlighted, setHighlighted] = useState(new Set())
  const [activeConn,  setActiveConn]  = useState(new Set())

  /* ── Tilt 3D ────────────────────────────────────────────── */
  const onMouseMove = useCallback((e) => {
    const r  = wrapRef.current?.getBoundingClientRect()
    if (!r) return
    const dx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2)
    const dy = (e.clientY - r.top   - r.height / 2) / (r.height / 2)
    setTilt({ x: dy * -7, y: dx * 7 })
  }, [])
  const onMouseLeave = useCallback(() => setTilt({ x:0, y:0 }), [])

  /* ── Simulation de flux ─────────────────────────────────── */
  useEffect(() => {
    if (!running || !scenario) return
    const sc = SCENARIOS[scenario]
    if (step >= sc.steps.length) { setRunning(false); return }
    const s = sc.steps[step]
    setHighlighted(new Set([CONNS.find(c => c.id === s.conn)?.from, CONNS.find(c => c.id === s.conn)?.to, s.node].filter(Boolean)))
    setActiveConn(new Set([s.conn]))
    const t = setTimeout(() => setStep(p => p + 1), 1200)
    return () => clearTimeout(t)
  }, [running, step, scenario])

  const startScenario = (key) => {
    setScenario(key)
    setStep(0)
    setRunning(true)
    setSelected(null)
    setHighlighted(new Set())
    setActiveConn(new Set())
  }

  const resetScenario = () => {
    setRunning(false)
    setStep(-1)
    setHighlighted(new Set())
    setActiveConn(new Set())
  }

  const currentStep = scenario && step >= 0 && step < SCENARIOS[scenario]?.steps.length
    ? SCENARIOS[scenario].steps[step]
    : null

  const selNode = selected ? NODES[selected] : null
  const selDetail = selected ? NODE_DETAILS[selected] : null

  const layerBands = [
    { label:'Clients / Consommateurs', y:26,  h:62,  color:'rgba(55,65,81,0.06)',  border:'rgba(55,65,81,0.12)',  side:'CONSOMMATEURS' },
    { label:'Interface',               y:142, h:65,  color:'rgba(67,56,202,0.06)', border:'rgba(67,56,202,0.15)', side:'FRONTEND' },
    { label:'Bus de services',         y:256, h:65,  color:'rgba(5,150,105,0.06)', border:'rgba(5,150,105,0.18)', side:'GATEWAY' },
    { label:'Microservices',           y:385, h:75,  color:'rgba(234,88,12,0.05)', border:'rgba(234,88,12,0.15)', side:'FOURNISSEURS' },
    { label:'Persistance',             y:498, h:70,  color:'rgba(51,103,145,0.07)',border:'rgba(51,103,145,0.2)', side:'BASE DE DONNÉES' },
  ]

  return (
    <div>
      {/* ── Scénarios ──────────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:10, fontWeight:700, color:'#A8A29E', textTransform:'uppercase', letterSpacing:'0.1em', marginRight:4 }}>Simuler un flux :</span>
        {Object.entries(SCENARIOS).map(([key, sc]) => (
          <button key={key} onClick={() => startScenario(key)} style={{
            padding:'7px 16px', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', transition:'all 0.15s',
            background: scenario === key && running ? sc.color : (scenario === key ? sc.color+'18' : '#F3F1EC'),
            color:      scenario === key && running ? '#fff'    : (scenario === key ? sc.color      : '#78716C'),
            boxShadow:  scenario === key && running ? `0 3px 12px ${sc.color}40` : '',
          }}>
            {sc.icon} {sc.label}
          </button>
        ))}
        {(running || step > 0) && (
          <button onClick={resetScenario} style={{ padding:'7px 14px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid #E2DDD3', background:'#fff', color:'#78716C', fontFamily:'inherit' }}>
            ↺ Réinitialiser
          </button>
        )}
      </div>

      {/* ── Message de l'étape courante ─────────────────────── */}
      {currentStep && (
        <div className="animate-fadeup" style={{ marginBottom:12, padding:'10px 16px', borderRadius:10, background: scenario ? SCENARIOS[scenario].color + '12' : '#F3F1EC', border:`1px solid ${scenario ? SCENARIOS[scenario].color+'30' : '#E2DDD3'}`, fontSize:12, fontWeight:500, color:'#1C1917', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ width:22, height:22, borderRadius:'50%', background: scenario ? SCENARIOS[scenario].color : '#EA580C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff', flexShrink:0 }}>
            {step + 1}
          </span>
          {currentStep.msg}
        </div>
      )}
      {scenario && !running && step > 0 && (
        <div className="animate-fadeup" style={{ marginBottom:12, padding:'10px 16px', borderRadius:10, background:'#ECFDF5', border:'1px solid #6EE7B7', fontSize:12, fontWeight:600, color:'#065F46', display:'flex', gap:8, alignItems:'center' }}>
          <span>✓</span> Flux « {SCENARIOS[scenario].label} » complété avec succès !
        </div>
      )}

      <div style={{ display:'flex', gap:14, alignItems:'flex-start', flexWrap:'wrap' }}>

        {/* ── Diagramme 3D ─────────────────────────────────── */}
        <div style={{ flex:'1 1 480px', minWidth:0 }}>
          <div
            ref={wrapRef}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            style={{ perspective:'1400px', cursor:'default' }}
          >
            <div style={{
              transform:`rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transformStyle:'preserve-3d',
              transition:'transform 0.12s ease-out',
              position:'relative',
              width:'100%',
              paddingTop:`${(VH/VW)*100}%`,
            }}>
              {/* SVG principal */}
              <svg
                viewBox={`0 0 ${VW} ${VH}`}
                style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%' }}
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Arrowhead markers */}
                  {Object.values(NODES).map(n => (
                    <marker key={n.color+'-m'} id={`arr-${n.color.replace('#','')}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L7,3 z" fill={n.color} />
                    </marker>
                  ))}
                  <marker id="arr-default" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L7,3 z" fill="#C9C4B5" />
                  </marker>

                  {/* Paths pour animateMotion */}
                  {CONNS.map(c => (
                    <path key={c.id+'-def'} id={c.id} d={c.path()} />
                  ))}

                  {/* Glow filter */}
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>

                {/* Bandes de couches */}
                {layerBands.map((b, i) => (
                  <g key={i}>
                    <rect x={50} y={b.y} width={VW-100} height={b.h} rx={10} ry={10}
                      fill={b.color} stroke={b.border} strokeWidth={0.8} />
                    <text x={60} y={b.y+13} fontSize={7} fontWeight={700} fill={b.border} letterSpacing={2}
                      fontFamily="'Plus Jakarta Sans', system-ui, sans-serif" textTransform="uppercase">
                      {b.side}
                    </text>
                  </g>
                ))}

                {/* Connexions */}
                {CONNS.map(c => {
                  const d      = c.path()
                  const isAct  = activeConn.has(c.id)
                  const color  = isAct ? c.color : '#C9C4B5'
                  const conn   = CONNS.find(x => x.id === c.id)
                  const arrId  = `arr-${isAct ? c.color.replace('#','') : 'default'}`
                  return (
                    <g key={c.id}>
                      {/* Shadow line */}
                      <use href={`#${c.id}`} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={3} />
                      {/* Main line */}
                      <use href={`#${c.id}`} fill="none" stroke={color} strokeWidth={isAct ? 1.8 : 1}
                        strokeDasharray={isAct ? '5 3' : '4 4'}
                        markerEnd={`url(#${arrId})`}
                        style={isAct ? { animation:'flowDash 0.6s linear infinite' } : { opacity:0.45 }}
                      />
                      {/* Animated packet dot */}
                      {isAct && (
                        <>
                          <circle r={4.5} fill={c.color} filter="url(#glow)" opacity={0.9}>
                            <animateMotion dur={`${c.dur}s`} repeatCount="indefinite" begin={`${c.begin}s`}>
                              <mpath href={`#${c.id}`} />
                            </animateMotion>
                          </circle>
                          <circle r={2.5} fill="#fff" opacity={0.8}>
                            <animateMotion dur={`${c.dur}s`} repeatCount="indefinite" begin={`${c.begin}s`}>
                              <mpath href={`#${c.id}`} />
                            </animateMotion>
                          </circle>
                        </>
                      )}
                      {/* Second packet */}
                      {isAct && c.id !== 'c4' && (
                        <circle r={3.5} fill={c.color} opacity={0.6}>
                          <animateMotion dur={`${c.dur}s`} repeatCount="indefinite" begin={`${c.begin + c.dur*0.5}s`}>
                            <mpath href={`#${c.id}`} />
                          </animateMotion>
                        </circle>
                      )}
                    </g>
                  )
                })}

                {/* Nœuds */}
                {Object.entries(NODES).map(([id, node]) => (
                  <SvgNode
                    key={id} id={id} node={node}
                    selected={selected}
                    highlighted={highlighted}
                    onClick={id => { setSelected(s => s === id ? null : id); resetScenario() }}
                  />
                ))}

                {/* Légende Provider / Consumer */}
                <g>
                  <rect x={60} y={560} width={110} height={22} rx={5} fill="#EFF6FF" stroke="#BFDBFE" strokeWidth={0.8} />
                  <circle cx={74} cy={571} r={4} fill="#4338CA" />
                  <text x={82} y={575} fontSize={8} fill="#1D4ED8" fontWeight={600} fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">CONSOMMATEUR (appelle)</text>
                </g>
                <g>
                  <rect x={185} y={560} width={110} height={22} rx={5} fill="#FFF7ED" stroke="#FDBA74" strokeWidth={0.8} />
                  <circle cx={199} cy={571} r={4} fill="#EA580C" />
                  <text x={207} y={575} fontSize={8} fill="#9A3412" fontWeight={600} fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">FOURNISSEUR (expose)</text>
                </g>
                <g>
                  <rect x={310} y={560} width={100} height={22} rx={5} fill="#ECFDF5" stroke="#6EE7B7" strokeWidth={0.8} />
                  <circle cx={324} cy={571} r={4} fill="#059669" />
                  <text x={332} y={575} fontSize={8} fill="#065F46" fontWeight={600} fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">ORCHESTRATEUR</text>
                </g>

                {/* Instructions */}
                <text x={830} y={572} fontSize={8} fill="#A8A29E" textAnchor="middle" fontStyle="italic" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">
                  Cliquer sur un nœud · Bouger la souris
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* ── Panneau détail nœud ────────────────────────────── */}
        <div style={{ flex:'0 0 230px', display:'flex', flexDirection:'column', gap:10 }}>
          {selNode && selDetail ? (
            <div className="animate-fadeup" style={{ borderRadius:12, overflow:'hidden', border:`1.5px solid ${selNode.color}40`, boxShadow:`0 4px 20px ${selNode.color}18` }}>
              <div style={{ background:selNode.color, padding:'14px 16px' }}>
                <div style={{ fontSize:20, marginBottom:8 }}>{selNode.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.2 }}>{selNode.label.replace('\n',' ')}</div>
                <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:4 }}>
                  {TYPE_LABEL[selNode.type] ?? selNode.type}
                </div>
              </div>
              <div style={{ padding:'14px 16px', background:'#fff' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#A8A29E', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Rôle SOA</div>
                <div style={{ fontSize:11, fontWeight:700, color:selNode.color, marginBottom:10 }}>{selDetail.role}</div>
                <div style={{ fontSize:10, fontWeight:700, color:'#A8A29E', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>Technologies</div>
                <div style={{ fontSize:11, color:'#44403C', fontFamily:'monospace', marginBottom:10, background:'#FAF8F3', padding:'5px 8px', borderRadius:6, border:'1px solid #E2DDD3' }}>{selDetail.tech}</div>
                <div style={{ fontSize:10, fontWeight:700, color:'#A8A29E', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>Description</div>
                <div style={{ fontSize:11, color:'#78716C', lineHeight:1.6 }}>{selDetail.desc}</div>
              </div>
              <div style={{ padding:'10px 16px', background:'#FAF8F3', borderTop:`1px solid ${selNode.color}20` }}>
                {/* Connexions de ce nœud */}
                <div style={{ fontSize:9, fontWeight:700, color:'#A8A29E', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Connexions</div>
                {CONNS.filter(c => c.from === selected || c.to === selected).map(c => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, fontSize:10 }}>
                    <span style={{ color: c.from === selected ? '#059669' : '#EA580C', fontWeight:700 }}>{c.from === selected ? '→' : '←'}</span>
                    <span style={{ color:'#44403C', fontWeight:600 }}>{c.from === selected ? c.to : c.from}</span>
                    <span style={{ color:'#A8A29E', fontFamily:'monospace', fontSize:9 }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding:'24px 16px', borderRadius:12, border:'1px dashed #E2DDD3', textAlign:'center', background:'#FAFAF8' }}>
              <div style={{ fontSize:28, marginBottom:10 }}>👆</div>
              <div style={{ fontSize:12, fontWeight:600, color:'#A8A29E', lineHeight:1.6 }}>
                Cliquer sur un composant du diagramme pour voir ses détails
              </div>
            </div>
          )}

          {/* Progression du scénario */}
          {scenario && (
            <div style={{ padding:'12px 14px', borderRadius:10, background:'#fff', border:'1px solid #E2DDD3' }}>
              <div style={{ fontSize:9, fontWeight:700, color:'#A8A29E', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
                {SCENARIOS[scenario].icon} {SCENARIOS[scenario].label}
              </div>
              {SCENARIOS[scenario].steps.map((s, i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                  <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, marginTop:1,
                    background: i < step ? SCENARIOS[scenario].color : (i === step ? SCENARIOS[scenario].color : '#F3F1EC'),
                    border: `1.5px solid ${i <= step ? SCENARIOS[scenario].color : '#E2DDD3'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:8, fontWeight:800, color: i <= step ? '#fff' : '#C9C4B5',
                  }}>
                    {i < step ? '✓' : i+1}
                  </div>
                  <div style={{ fontSize:10, color: i <= step ? '#1C1917' : '#C9C4B5', lineHeight:1.4, transition:'color 0.3s', fontWeight: i === step ? 600 : 400 }}>
                    {s.msg.length > 55 ? s.msg.slice(0,52)+'…' : s.msg}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Provider vs Consumer */}
          <div style={{ padding:'12px 14px', borderRadius:10, background:'#fff', border:'1px solid #E2DDD3' }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#A8A29E', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
              Modèle SOA
            </div>
            {[
              { label:'Consommateurs', items:['Navigateur Web', 'Dashboard React', 'App Mobile'], color:'#4338CA' },
              { label:'Fournisseurs', items:['Svc Places :8001', 'Svc Trans :8002', 'Svc Reporting :8003'], color:'#EA580C' },
              { label:'Bus de services', items:['API Gateway Nginx :8090'], color:'#059669' },
            ].map(g => (
              <div key={g.label} style={{ marginBottom:10 }}>
                <div style={{ fontSize:9, fontWeight:700, color:g.color, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{g.label}</div>
                {g.items.map(it => (
                  <div key={it} style={{ fontSize:10, color:'#44403C', padding:'2px 0', display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:4, height:4, borderRadius:'50%', background:g.color, display:'inline-block', flexShrink:0 }} />
                    {it}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSS animation injected */}
      <style>{`
        @keyframes flowDash {
          to { stroke-dashoffset: -8; }
        }
      `}</style>
    </div>
  )
}
