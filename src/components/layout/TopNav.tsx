import { Sun, Moon, Menu, Search } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import type { ViewKey } from '@/lib/types'

const VIEW_TITLES: Record<ViewKey, string> = {
  dashboard: 'Daily Brief',
  calendar: 'Calendar',
  habits: 'Habits',
  todos: 'To-Do List',
  goals: 'Goals',
  notes: 'Notes',
  academics: 'Academics',
  docs: 'Doc Hub',
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
    <header className="h-14 flex items-center gap-4 px-4 bg-white dark:bg-mauve-800 border-b border-blush-100 dark:border-mauve-700 flex-shrink-0">
      <button
        onClick={onToggleSidebar}
        className="p-1.5 rounded-lg text-mauve-400 hover:text-plum-800 dark:hover:text-mauve-100 hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>

      <div className="flex-1">
        <h1 className="font-semibold text-plum-800 dark:text-mauve-100 text-sm sm:text-base">
          {VIEW_TITLES[activeView]}
        </h1>
        <p className="text-xs text-mauve-400 dark:text-mauve-400 hidden sm:block">{today}</p>
      </div>

      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blush-50 dark:bg-mauve-700 border border-blush-100 dark:border-mauve-600 text-sm text-mauve-400">
        <Search size={14} />
        <span className="text-xs">Quick search…</span>
      </div>

      <button
        onClick={toggle}
        className="p-1.5 rounded-lg text-mauve-400 hover:text-plum-800 dark:hover:text-mauve-100 hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blush-400 to-blush-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 cursor-pointer">
        E
      </div>
    </header>
  )
}
