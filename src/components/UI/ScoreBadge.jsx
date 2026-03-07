import { Zap } from 'lucide-react'

export default function ScoreBadge({ score }) {
  const [color, bg] =
    score >= 500 ? ['text-purple-300', 'bg-purple-500/10'] :
    score >= 200 ? ['text-amber-300',  'bg-amber-500/10']  :
    score >= 50  ? ['text-blue-300',   'bg-blue-500/10']   :
                   ['text-muted',      'bg-surface-200']

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color} ${bg}`}>
      <Zap size={9} className="fill-current" />
      {score}
    </span>
  )
}
