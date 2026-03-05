import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Target,
  StickyNote,
  GraduationCap,
  FolderOpen,
  Flame,
} from 'lucide-react'
import type { ViewKey } from '@/lib/types'

const NAV_ITEMS = [
  { key: 'dashboard' as ViewKey, label: 'Brief',    icon: LayoutDashboard },
  { key: 'calendar'  as ViewKey, label: 'Calendar', icon: CalendarDays },
  { key: 'habits'    as ViewKey, label: 'Habits',   icon: Flame },
  { key: 'todos'     as ViewKey, label: 'Tasks',    icon: CheckSquare },
  { key: 'goals'     as ViewKey, label: 'Goals',    icon: Target },
  { key: 'notes'     as ViewKey, label: 'Notes',    icon: StickyNote },
  { key: 'academics' as ViewKey, label: 'School',   icon: GraduationCap },
  { key: 'docs'      as ViewKey, label: 'Docs',     icon: FolderOpen },
]

interface Props {
  activeView: ViewKey
  onNavigate: (view: ViewKey) => void
}

export default function BottomNav({ activeView, onNavigate }: Props) {
  return (
    <nav className="
      fixed bottom-0 left-0 right-0 z-40
      bg-white/95 dark:bg-mauve-900/95 backdrop-blur-xl
      border-t border-black/[0.06] dark:border-white/[0.05]
      flex items-stretch
      pb-[env(safe-area-inset-bottom)]
    ">
      {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
        const active = activeView === key
        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`
              flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-w-0
              transition-colors duration-150
              ${active
                ? 'text-blush-500 dark:text-blush-400'
                : 'text-mauve-400 dark:text-mauve-500'
              }
            `}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
            <span className="text-[9px] font-medium leading-none truncate w-full text-center px-0.5">
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
