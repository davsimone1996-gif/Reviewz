import { useState } from 'react'
import { Star } from 'lucide-react'

const LABELS = ['', 'Awful', 'Bad', 'Poor', 'Mediocre', 'Decent', 'Good', 'Great', 'Excellent', 'Amazing', 'Masterpiece']

export default function RatingPicker({ value, onChange }) {
  const [hover, setHover] = useState(null)
  const display = hover ?? value

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {Array.from({ length: 10 }, (_, i) => {
          const v = i + 1
          return (
            <button
              key={v}
              type="button"
              onMouseEnter={() => setHover(v)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onChange(v)}
              className="transition-transform hover:scale-125 active:scale-110 p-0.5"
            >
              <Star
                size={24}
                className={`transition-colors ${
                  v <= display
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-surface-300 hover:text-amber-300'
                }`}
              />
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-3">
        {display > 0 && (
          <>
            <span className={`text-2xl font-black tabular-nums ${
              display >= 8 ? 'text-emerald-400' :
              display >= 6 ? 'text-amber-400' :
              display >= 4 ? 'text-orange-400' :
                             'text-red-400'
            }`}>{display}<span className="text-sm font-medium text-muted">/10</span></span>
            <span className="text-sm text-muted font-medium">{LABELS[display]}</span>
          </>
        )}
        {display === 0 && <span className="text-sm text-muted">Hover to rate</span>}
      </div>
    </div>
  )
}
