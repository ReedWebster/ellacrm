import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  selected: Date
  onSelect: (d: Date) => void
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function MiniMonth({ selected, onSelect }: Props) {
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const sel = new Date(selected); sel.setHours(0, 0, 0, 0)

  // Build a 6-week grid starting at the Sunday on/before the 1st
  const start = new Date(month)
  start.setDate(1 - start.getDay())
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  function shift(delta: number) {
    setMonth(m => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  }

  return (
    <div className="px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => shift(-1)}
          className="p-1 rounded text-linen-500 dark:text-ink-300 hover:bg-linen-100 dark:hover:bg-ink-700"
        >
          <ChevronLeft size={13} strokeWidth={2} />
        </button>
        <span className="text-[12px] font-semibold text-plum-800 dark:text-ink-100 tracking-tight">
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => shift(1)}
          className="p-1 rounded text-linen-500 dark:text-ink-300 hover:bg-linen-100 dark:hover:bg-ink-700"
        >
          <ChevronRight size={13} strokeWidth={2} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-medium text-linen-400 dark:text-ink-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          const isToday = d.getTime() === today.getTime()
          const isSelected = d.getTime() === sel.getTime()
          const inMonth = d.getMonth() === month.getMonth()
          return (
            <button
              key={i}
              onClick={() => onSelect(d)}
              className={`
                aspect-square flex items-center justify-center rounded-md text-[11px] font-medium transition-all
                ${isSelected
                  ? 'bg-blush-500 text-white'
                  : isToday
                    ? 'text-blush-600 dark:text-blush-400 ring-1 ring-blush-400/40'
                    : inMonth
                      ? 'text-plum-800 dark:text-ink-100 hover:bg-linen-100 dark:hover:bg-ink-700'
                      : 'text-linen-300 dark:text-ink-500 hover:bg-linen-100 dark:hover:bg-ink-700'
                }
              `}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
