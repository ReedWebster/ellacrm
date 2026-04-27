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
  Gamepad2,
} from 'lucide-react'
import type { ViewKey } from '@/lib/types'

interface NavItem {
  key: ViewKey
  label: string
  icon: React.ElementType
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Daily',
    items: [
      { key: 'dashboard', label: 'Daily Brief',  icon: LayoutDashboard },
      { key: 'calendar',  label: 'Calendar',     icon: CalendarDays },
    ],
  },
  {
    title: 'Productivity',
    items: [
      { key: 'habits',    label: 'Habits',       icon: Flame },
      { key: 'todos',     label: 'To-Do',        icon: CheckSquare },
      { key: 'goals',     label: 'Goals',        icon: Target },
    ],
  },
  {
    title: 'Knowledge',
    items: [
      { key: 'notes',     label: 'Notes',        icon: StickyNote },
      { key: 'academics', label: 'Academics',    icon: GraduationCap },
      { key: 'docs',      label: 'Doc Hub',      icon: FolderOpen },
    ],
  },
  {
    title: 'Play',
    items: [
      { key: 'solitaire', label: 'Solitaire',    icon: Gamepad2 },
    ],
  },
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
        bg-white dark:bg-ink-900
        border-r border-linen-200 dark:border-ink-800
        transition-all duration-300 ease-in-out flex-shrink-0
        ${collapsed ? 'w-[68px]' : 'w-[220px]'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 px-4 ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-gradient-to-br from-blush-400 to-blush-600 shadow-sm flex-shrink-0">
          <Flower2 size={14} className="text-white" />
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-2.5'}`}>
          <span className="font-bold text-[17px] text-plum-800 dark:text-white tracking-[-0.05em] uppercase select-none whitespace-nowrap">
            BLOOM
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.title} className={si > 0 ? 'mt-4' : ''}>
            {/* Section label */}
            <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
              <p className="px-4 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-linen-400 dark:text-ink-400 select-none">
                {section.title}
              </p>
            </div>
            {collapsed && si > 0 && (
              <div className="mx-4 mb-2 h-px bg-linen-200 dark:bg-ink-700" />
            )}
            <ul className="space-y-0.5 px-2">
              {section.items.map(({ key, label, icon: Icon }) => {
                const active = activeView === key
                return (
                  <li key={key}>
                    <button
                      onClick={() => onNavigate(key)}
                      title={collapsed ? label : undefined}
                      className={`
                        relative w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-[10px] text-[13px] font-medium
                        transition-all duration-150 select-none
                        ${active
                          ? 'text-blush-600 dark:text-blush-300'
                          : 'text-linen-600 dark:text-ink-300 hover:bg-linen-100 dark:hover:bg-ink-800 hover:text-plum-800 dark:hover:text-ink-100'
                        }
                        ${collapsed ? 'justify-center px-0' : ''}
                      `}
                    >
                      {/* Active indicator bar — sole signal */}
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-blush-500 dark:bg-blush-400" />
                      )}
                      <Icon
                        size={16}
                        className="flex-shrink-0"
                        strokeWidth={active ? 2.2 : 1.8}
                      />
                      <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        <span className="whitespace-nowrap">{label}</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'h-0 opacity-0 p-0' : 'h-auto opacity-100 px-4 py-4'}`}>
        <div className="border-t border-linen-200 dark:border-ink-800 pt-3">
          <p className="text-[11px] text-linen-500 dark:text-ink-400 select-none">Ella's hub</p>
        </div>
      </div>
    </aside>
  )
}
