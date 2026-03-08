import { Zap } from 'lucide-react'

function getTier(score) {
  if (score >= 90) return { color: '#E0115F', bg: 'rgba(224,17,95,0.15)', border: 'rgba(224,17,95,0.30)' }
  if (score >= 60) return { color: '#FFD700', bg: 'rgba(255,215,0,0.12)',  border: 'rgba(255,215,0,0.30)'  }
  if (score >= 30) return { color: '#C0C0C0', bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.25)' }
  return           { color: '#CD853F', bg: 'rgba(205,133,63,0.15)', border: 'rgba(205,133,63,0.30)' }
}

export default function ScoreBadge({ score }) {
  const { color, bg, border } = getTier(score ?? 0)

  return (
    <span
      style={{ color, backgroundColor: bg, borderColor: border }}
      className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
    >
      <Zap size={9} className="fill-current" />
      {score}
    </span>
  )
}
