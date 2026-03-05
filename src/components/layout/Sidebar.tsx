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
  { key: 'dashboard', label: 'Daily Brief', icon: LayoutDashboard },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'habits', label: 'Habits', icon: Flame },
  { key: 'todos', label: 'To-Do', icon: CheckSquare },
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'academics', label: 'Academics', icon: GraduationCap },
  { key: 'docs', label: 'Doc Hub', icon: FolderOpen },
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
        flex flex-col h-full bg-white dark:bg-mauve-800 border-r border-blush-100 dark:border-mauve-700
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-56'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2 px-4 py-5 border-b border-blush-100 dark:border-mauve-700 ${collapsed ? 'justify-center px-2' : ''}`}>
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blush-400 to-blush-600 shadow-sm flex-shrink-0">
          <Flower2 size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-lg text-plum-800 dark:text-mauve-100 tracking-tight">
            Bloom
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const active = activeView === key
            return (
              <li key={key}>
                <button
                  onClick={() => onNavigate(key)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-150
                    ${active
                      ? 'bg-blush-100 dark:bg-blush-900/30 text-blush-600 dark:text-blush-400'
                      : 'text-mauve-400 dark:text-mauve-300 hover:bg-blush-50 dark:hover:bg-mauve-700 hover:text-plum-800 dark:hover:text-mauve-100'
                    }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className={`p-4 border-t border-blush-100 dark:border-mauve-700 ${collapsed ? 'text-center' : ''}`}>
        {!collapsed && (
          <p className="text-xs text-mauve-400 dark:text-mauve-400">
            Ella's personal hub
          </p>
        )}
      </div>
    </aside>
  )
}
