function Card({ icon, value, label, sub, color, flash }) {
  const colors = {
    green:  { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', val: 'text-emerald-700', sub: 'text-emerald-600 bg-emerald-100' },
    red:    { bg: 'bg-rose-50',    border: 'border-rose-200',    icon: 'bg-rose-100 text-rose-600',       val: 'text-rose-700',    sub: 'text-rose-600 bg-rose-100' },
    amber:  { bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'bg-amber-100 text-amber-600',     val: 'text-amber-700',   sub: 'text-amber-600 bg-amber-100' },
    indigo: { bg: 'bg-indigo-50',  border: 'border-indigo-200',  icon: 'bg-indigo-100 text-indigo-600',   val: 'text-indigo-700',  sub: 'text-indigo-600 bg-indigo-100' },
    slate:  { bg: 'bg-white',      border: 'border-slate-200',   icon: 'bg-slate-100 text-slate-600',     val: 'text-slate-800',   sub: 'text-slate-600 bg-slate-100' },
  }
  const c = colors[color] ?? colors.slate
  return (
    <div className={`${c.bg} ${c.border} ${flash ? 'animate-kpiflash' : ''}
      border rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:-translate-y-0.5
      transition-transform duration-150`}>
      <div className={`${c.icon} w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className={`${c.val} text-2xl font-black leading-none`}>{value}</div>
        <div className="text-slate-500 text-xs mt-1 uppercase tracking-wide font-medium">{label}</div>
        <span className={`${c.sub} text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block`}>
          {sub}
        </span>
      </div>
    </div>
  )
}

export default function KpiCards({ stats, alertes }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 h-24 animate-pulse">
            <div className="bg-slate-100 rounded-xl h-8 w-8 mb-2" />
            <div className="bg-slate-100 rounded h-5 w-16" />
          </div>
        ))}
      </div>
    )
  }

  const total    = stats.total    ?? 0
  const libres   = stats.libres   ?? 0
  const occupees = stats.occupees ?? 0
  const taux     = parseFloat(stats.taux_occupation ?? 0)
  const nbAlerts = alertes?.length ?? 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card
        icon="🟢"
        value={libres}
        label="Places libres"
        sub={libres === 0 ? 'Complet !' : libres <= 5 ? 'Presque plein' : `/ ${total} places`}
        color={libres === 0 ? 'red' : libres <= 5 ? 'amber' : 'green'}
        flash={libres === 0}
      />
      <Card
        icon="🚗"
        value={occupees}
        label="Véhicules garés"
        sub={`sur ${total} places`}
        color="indigo"
      />
      <Card
        icon="📊"
        value={`${taux.toFixed(1)}%`}
        label="Taux d'occupation"
        sub={taux >= 90 ? 'Critique' : taux >= 75 ? 'Élevé' : 'Normal'}
        color={taux >= 90 ? 'red' : taux >= 75 ? 'amber' : 'green'}
        flash={taux >= 90}
      />
      <Card
        icon="⚠"
        value={nbAlerts}
        label="Alertes actives"
        sub={nbAlerts > 0 ? 'Attention !' : 'Tout va bien'}
        color={nbAlerts > 0 ? 'red' : 'green'}
        flash={nbAlerts > 0}
      />
    </div>
  )
}
