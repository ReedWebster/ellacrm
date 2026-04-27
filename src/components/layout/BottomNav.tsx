import { useState } from 'react'
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Target,
  StickyNote,
  GraduationCap,
  FolderOpen,
  Flame,
  Gamepad2,
  MoreHorizontal,
  X,
} from 'lucide-react'
import type { ViewKey } from '@/lib/types'

const PRIMARY_ITEMS = [
  { key: 'dashboard' as ViewKey, label: 'Brief',    icon: LayoutDashboard },
  { key: 'calendar'  as ViewKey, label: 'Calendar', icon: CalendarDays },
  { key: 'habits'    as ViewKey, label: 'Habits',   icon: Flame },
  { key: 'todos'     as ViewKey, label: 'Tasks',    icon: CheckSquare },
  { key: 'goals'     as ViewKey, label: 'Goals',    icon: Target },
]

const MORE_ITEMS = [
  { key: 'notes'     as ViewKey, label: 'Notes',      icon: StickyNote },
  { key: 'academics' as ViewKey, label: 'School',     icon: GraduationCap },
  { key: 'docs'      as ViewKey, label: 'Docs',       icon: FolderOpen },
  { key: 'solitaire' as ViewKey, label: 'Solitaire',  icon: Gamepad2 },
]

interface Props {
  activeView: ViewKey
  onNavigate: (view: ViewKey) => void
}

export default function BottomNav({ activeView, onNavigate }: Props) {
  const [showMore, setShowMore] = useState(false)
  const isMoreActive = MORE_ITEMS.some(i => i.key === activeView)

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 bg-white dark:bg-ink-800 rounded-2xl shadow-modal border border-black/[0.06] dark:border-white/[0.05] overflow-hidden animate-menu-in" onClick={e => e.stopPropagation()}>
            {MORE_ITEMS.map(({ key, label, icon: Icon }) => {
              const active = activeView === key
              return (
                <button
                  key={key}
                  onClick={() => { onNavigate(key); setShowMore(false) }}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-[13px] transition-colors border-l-2 ${
                    active
                      ? 'text-blush-500 border-blush-500'
                      : 'text-plum-800 dark:text-mauve-100 border-transparent hover:bg-linen-100 dark:hover:bg-ink-700'
                  }`}
                >
                  <Icon size={16} strokeWidth={active ? 2.2 : 1.6} />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Floating pill nav */}
      <nav className="
        fixed bottom-3 left-3 right-3 z-40
        bg-white/95 dark:bg-ink-800/95 backdrop-blur-xl
        border border-black/[0.08] dark:border-white/[0.06]
        rounded-2xl shadow-modal
        flex items-stretch
        mb-[env(safe-area-inset-bottom)]
      ">
        {PRIMARY_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = activeView === key
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`
                flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-w-0
                transition-colors duration-150 relative
                ${active
                  ? 'text-blush-500 dark:text-blush-400'
                  : 'text-mauve-400 dark:text-mauve-500'
                }
              `}
            >
              {active && (
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-blush-500 dark:bg-blush-400" />
              )}
              <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
              <span className="text-[9px] font-medium leading-none truncate w-full text-center px-0.5">
                {label}
              </span>
            </button>
          )
        })}
        {/* More button */}
        <button
          onClick={() => setShowMore(s => !s)}
          className={`
            flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-w-0
            transition-colors duration-150 relative
            ${isMoreActive
              ? 'text-blush-500 dark:text-blush-400'
              : 'text-mauve-400 dark:text-mauve-500'
            }
          `}
        >
          {isMoreActive && (
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-blush-500 dark:bg-blush-400" />
          )}
          {showMore ? <X size={20} strokeWidth={1.6} /> : <MoreHorizontal size={20} strokeWidth={1.6} />}
          <span className="text-[9px] font-medium leading-none">More</span>
        </button>
      </nav>
    </>
  )
}
