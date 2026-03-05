import { Sun, Moon, Menu, Search } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import type { ViewKey } from '@/lib/types'

const VIEW_TITLES: Record<ViewKey, string> = {
  dashboard: 'Daily Brief',
  calendar:  'Calendar',
  habits:    'Habits',
  todos:     'To-Do List',
  goals:     'Goals',
  notes:     'Notes',
  academics: 'Academics',
  docs:      'Doc Hub',
}

interface TopNavProps {
  activeView: ViewKey
  onToggleSidebar: () => void
}

export default function TopNav({ activeView, onToggleSidebar }: TopNavProps) {
  const { theme, toggle } = useTheme()

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <header className="
      h-14 flex items-center gap-3 px-4 flex-shrink-0
      bg-white/90 dark:bg-mauve-900/90 backdrop-blur-xl
      border-b border-black/[0.06] dark:border-white/[0.05]
    ">
      <button
        onClick={onToggleSidebar}
        className="p-1.5 rounded-lg text-mauve-400 hover:text-plum-800 dark:hover:text-mauve-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors flex-shrink-0"
        aria-label="Toggle sidebar"
      >
        <Menu size={17} strokeWidth={1.8} />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="font-semibold text-[15px] text-plum-800 dark:text-white tracking-tight leading-none">
          {VIEW_TITLES[activeView]}
        </h1>
        <p className="text-[11px] text-mauve-400 dark:text-mauve-500 mt-0.5 hidden sm:block">{today}</p>
      </div>

      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blush-50 dark:bg-mauve-800 border border-black/[0.05] dark:border-white/[0.05] text-mauve-400 cursor-pointer hover:bg-blush-100 dark:hover:bg-mauve-700 transition-colors">
        <Search size={13} strokeWidth={1.8} />
        <span className="text-[12px] text-mauve-400">Search…</span>
      </div>

      <button
        onClick={toggle}
        className="p-1.5 rounded-lg text-mauve-400 hover:text-plum-800 dark:hover:text-mauve-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors flex-shrink-0"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark'
          ? <Sun size={17} strokeWidth={1.8} />
          : <Moon size={17} strokeWidth={1.8} />
        }
      </button>

      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blush-400 to-blush-600 flex items-center justify-center text-white text-[12px] font-semibold flex-shrink-0 cursor-pointer shadow-sm select-none">
        E
      </div>
    </header>
  )
}
