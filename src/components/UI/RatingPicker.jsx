import { useState } from 'react'
import { Star } from 'lucide-react'

export default function RatingPicker({ value, onChange }) {
  const [hover, setHover] = useState(null)
  const display = hover ?? value

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }, (_, i) => {
        const v = i + 1
        return (
          <Star
            key={v}
            size={22}
            className={`cursor-pointer transition-colors ${v <= display ? 'fill-amber-400 text-amber-400' : 'text-surface-300 hover:text-amber-300'}`}
            onMouseEnter={() => setHover(v)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(v)}
          />
        )
      })}
      {value > 0 && <span className="ml-2 text-amber-400 font-semibold">{value}/10</span>}
    </div>
  )
}
