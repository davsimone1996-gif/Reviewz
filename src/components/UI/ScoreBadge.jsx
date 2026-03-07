import { Zap } from 'lucide-react'

export default function ScoreBadge({ score }) {
  const tier =
    score >= 500 ? 'text-purple-400' :
    score >= 200 ? 'text-amber-400' :
    score >= 50  ? 'text-blue-400' :
    'text-muted'

  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${tier}`}>
      <Zap size={12} />
      {score}
    </span>
  )
}
