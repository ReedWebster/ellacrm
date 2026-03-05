import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Target,
  StickyNote,
  GraduationCap,
  FolderOpen,
  Flame,
  Flower2,
} from 'lucide-react'
import type { ViewKey } from '@/lib/types'

interface NavItem {
  key: ViewKey
  label: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Daily Brief',  icon: LayoutDashboard },
  { key: 'calendar',  label: 'Calendar',     icon: CalendarDays },
  { key: 'habits',    label: 'Habits',       icon: Flame },
  { key: 'todos',     label: 'To-Do',        icon: CheckSquare },
  { key: 'goals',     label: 'Goals',        icon: Target },
  { key: 'notes',     label: 'Notes',        icon: StickyNote },
  { key: 'academics', label: 'Academics',    icon: GraduationCap },
  { key: 'docs',      label: 'Doc Hub',      icon: FolderOpen },
]

interface SidebarProps {
  activeView: ViewKey
  onNavigate: (view: ViewKey) => void
  collapsed: boolean
}

export default function Sidebar({ activeView, onNavigate, collapsed }: SidebarProps) {
  return (
    <aside
      className={`
        flex flex-col h-full
        bg-white dark:bg-mauve-900
        border-r border-black/[0.06] dark:border-white/[0.05]
        transition-all duration-300 ease-in-out flex-shrink-0
        ${collapsed ? 'w-[68px]' : 'w-[220px]'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 px-4 ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-gradient-to-br from-blush-400 to-blush-600 shadow-sm flex-shrink-0">
          <Flower2 size={14} className="text-white" />
        </div>
        {!collapsed && (
          <span className="ml-2.5 font-bold text-[17px] text-plum-800 dark:text-white tracking-[-0.05em] uppercase select-none">
            SWAGR
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const active = activeView === key
            return (
              <li key={key}>
                <button
                  onClick={() => onNavigate(key)}
                  title={collapsed ? label : undefined}
                  className={`
                    w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-[10px] text-[13px] font-medium
                    transition-all duration-150 select-none
                    ${active
                      ? 'bg-blush-100 dark:bg-blush-900/40 text-blush-700 dark:text-blush-300'
                      : 'text-mauve-500 dark:text-mauve-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-plum-800 dark:hover:text-mauve-100'
                    }
                    ${collapsed ? 'justify-center px-0' : ''}
                  `}
                >
                  <Icon
                    size={16}
                    className="flex-shrink-0"
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  {!collapsed && <span>{label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-black/[0.05] dark:border-white/[0.05]">
          <p className="text-[11px] text-mauve-400 dark:text-mauve-500 select-none">Ella's hub</p>
        </div>
      )}
    </aside>
  )
}
