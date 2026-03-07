import { Star } from 'lucide-react'

export default function StarRating({ value, size = 'sm' }) {
  const stars = 5
  const normalized = value / 2  // convert /10 to /5

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: stars }, (_, i) => {
        const filled = i < Math.floor(normalized)
        const half   = !filled && i < normalized
        return (
          <Star
            key={i}
            size={size === 'sm' ? 13 : 17}
            className={`${
              filled ? 'fill-amber-400 text-amber-400' :
              half   ? 'fill-amber-400/40 text-amber-400/40' :
                       'text-surface-300'
            }`}
          />
        )
      })}
      <span className={`ml-1.5 font-bold tabular-nums ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      } ${
        value >= 8 ? 'text-emerald-400' :
        value >= 6 ? 'text-amber-400' :
        value >= 4 ? 'text-orange-400' :
                     'text-red-400'
      }`}>
        {value.toFixed(1)}
      </span>
    </div>
  )
}
