type Counts = { alta: number; media: number; baja: number; "sin-relevamiento": number }

const COLORS = {
  alta: "#BF1363",
  media: "#FFE066",
  baja: "#43AA8B",
  "sin-relevamiento": "#EDEDF4",
} as const

const LABELS = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
  "sin-relevamiento": "Pendiente de evaluación",
} as const

export function CriticalityDonut({ counts }: { counts: Counts }) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  let cursor = 0
  const radius = 72
  const circumference = 2 * Math.PI * radius

  return (
    <div className="donut-layout">
      <div className="donut-chart" aria-label={`Distribución de ${total} instituciones`}>
        <svg viewBox="0 0 180 180" role="img">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#C1B8C8" strokeWidth="24" />
          {total > 0 && (Object.entries(counts) as Array<[keyof Counts, number]>).map(([key, value]) => {
            if (!value) return null
            const length = (value / total) * circumference
            const dash = `${length} ${circumference - length}`
            const offset = -cursor
            cursor += length
            return (
              <circle
                key={key}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={COLORS[key]}
                strokeWidth="24"
                strokeDasharray={dash}
                strokeDashoffset={offset}
                transform="rotate(-90 90 90)"
              />
            )
          })}
          <text x="90" y="86" textAnchor="middle" className="donut-total">{total}</text>
          <text x="90" y="105" textAnchor="middle" className="donut-caption">instituciones</text>
        </svg>
      </div>
      <div className="donut-legend">
        {(Object.keys(LABELS) as Array<keyof Counts>).map((key) => (
          <div className="donut-legend-item" key={key}>
            <span className="donut-dot" style={{ background: COLORS[key] }} />
            <span>{LABELS[key]}</span>
            <strong>{counts[key]}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
