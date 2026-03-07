import { Star } from 'lucide-react'

export default function StarRating({ value, max = 10, size = 'sm', interactive = false, onChange }) {
  const stars = max === 10 ? 10 : 5
  const normalized = max === 10 ? value / 2 : value // convert to 5-star display

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: stars }, (_, i) => {
        const filled = i < Math.floor(normalized)
        const half = !filled && i < normalized
        return (
          <Star
            key={i}
            size={size === 'sm' ? 14 : 18}
            className={`${filled ? 'fill-amber-400 text-amber-400' : half ? 'fill-amber-400/50 text-amber-400' : 'text-surface-300'} ${interactive ? 'cursor-pointer hover:text-amber-400 transition-colors' : ''}`}
            onClick={() => interactive && onChange && onChange((i + 1) * (max / stars))}
          />
        )
      })}
      <span className="ml-1 text-sm font-semibold text-amber-400">{value.toFixed(1)}</span>
    </div>
  )
}
