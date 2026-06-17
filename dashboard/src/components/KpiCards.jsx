function KpiCard({ value, label, sub, color, flash, icon }) {
  const palette = {
    green:  {
      icon:   'rgba(16,185,129,0.18)',
      iconC:  '#10b981',
      val:    '#34d399',
      subBg:  'rgba(16,185,129,0.12)',
      subC:   '#6ee7b7',
      subBd:  'rgba(16,185,129,0.2)',
      glow:   'rgba(16,185,129,0.18)',
    },
    red: {
      icon:   'rgba(244,63,94,0.18)',
      iconC:  '#f43f5e',
      val:    '#fb7185',
      subBg:  'rgba(244,63,94,0.12)',
      subC:   '#fda4af',
      subBd:  'rgba(244,63,94,0.25)',
      glow:   'rgba(244,63,94,0.2)',
    },
    amber: {
      icon:   'rgba(245,158,11,0.18)',
      iconC:  '#f59e0b',
      val:    '#fbbf24',
      subBg:  'rgba(245,158,11,0.12)',
      subC:   '#fde68a',
      subBd:  'rgba(245,158,11,0.25)',
      glow:   'rgba(245,158,11,0.15)',
    },
    indigo: {
      icon:   'rgba(99,102,241,0.18)',
      iconC:  '#6366f1',
      val:    '#a5b4fc',
      subBg:  'rgba(99,102,241,0.12)',
      subC:   '#c7d2fe',
      subBd:  'rgba(99,102,241,0.25)',
      glow:   'rgba(99,102,241,0.15)',
    },
  }
  const p = palette[color] ?? palette.indigo

  return (
    <div
      className={flash ? 'animate-kpiflash' : ''}
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        transition: 'transform 0.15s, box-shadow 0.15s',
        cursor: 'default',
        boxShadow: flash ? undefined : `0 0 0 0 transparent`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 8px 32px ${p.glow}, 0 2px 8px rgba(0,0,0,0.3)`
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
      }}
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: p.icon,
        border: `1px solid ${p.subBd}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: p.iconC,
        boxShadow: `0 0 16px ${p.glow}`,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 26, fontWeight: 800, lineHeight: 1,
          color: p.val,
          letterSpacing: '-0.5px',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#475569', marginTop: 5,
        }}>
          {label}
        </div>
        <span style={{
          display: 'inline-block', marginTop: 4,
          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
          background: p.subBg, color: p.subC, border: `1px solid ${p.subBd}`,
        }}>
          {sub}
        </span>
      </div>
    </div>
  )
}

export default function KpiCards({ stats, alertes }) {
  if (!stats) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{
            borderRadius: 16, padding: '18px 20px', height: 90,
            border: '1px solid rgba(255,255,255,0.06)',
          }} className="skeleton" />
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      <KpiCard
        icon="○"
        value={libres}
        label="Places libres"
        sub={libres === 0 ? 'Complet !' : libres <= 5 ? 'Presque plein' : `sur ${total}`}
        color={libres === 0 ? 'red' : libres <= 5 ? 'amber' : 'green'}
        flash={libres === 0}
      />
      <KpiCard
        icon="▲"
        value={occupees}
        label="Véhicules garés"
        sub={`sur ${total} places`}
        color="indigo"
      />
      <KpiCard
        icon="%"
        value={`${taux.toFixed(1)}%`}
        label="Taux d'occupation"
        sub={taux >= 90 ? 'Critique' : taux >= 75 ? 'Élevé' : 'Normal'}
        color={taux >= 90 ? 'red' : taux >= 75 ? 'amber' : 'green'}
        flash={taux >= 90}
      />
      <KpiCard
        icon="⚡"
        value={nbAlerts}
        label="Alertes actives"
        sub={nbAlerts > 0 ? 'Attention requise' : 'Tout va bien'}
        color={nbAlerts > 0 ? 'red' : 'green'}
        flash={nbAlerts > 0}
      />
    </div>
  )
}
