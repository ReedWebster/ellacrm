import { useState, useEffect, useRef } from 'react'
import { Sun, Moon, Menu, Search, LogOut } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
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
  const { signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="
      h-14 flex items-center gap-3 px-4 flex-shrink-0
      bg-white/90 dark:bg-mauve-900/90 backdrop-blur-xl
      border-b border-black/[0.06] dark:border-white/[0.05]
    ">
      <button
        onClick={onToggleSidebar}
        className="hidden md:flex p-1.5 rounded-lg text-mauve-400 hover:text-plum-800 dark:hover:text-mauve-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors flex-shrink-0"
        aria-label="Toggle sidebar"
      >
        <Menu size={17} strokeWidth={1.8} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-mauve-400 dark:text-mauve-500 font-medium hidden sm:inline">Bloom</span>
          <span className="text-mauve-300 dark:text-mauve-600 hidden sm:inline">/</span>
          <h1 className="font-semibold text-[15px] text-plum-800 dark:text-white tracking-tight leading-none">
            {VIEW_TITLES[activeView]}
          </h1>
        </div>
        <p className="text-[11px] text-mauve-400 dark:text-mauve-500 mt-0.5 hidden sm:block">{today}</p>
      </div>

      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blush-50 dark:bg-mauve-800 border border-black/[0.05] dark:border-white/[0.05] text-mauve-400 cursor-pointer hover:bg-blush-100 dark:hover:bg-mauve-700 transition-colors">
        <Search size={13} strokeWidth={1.8} />
        <span className="text-[12px] text-mauve-400">Search...</span>
      </div>

      {/* Avatar + dropdown */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          onClick={() => setShowMenu(s => !s)}
          className={`w-7 h-7 rounded-full bg-gradient-to-br from-blush-400 to-blush-600 flex items-center justify-center text-white text-[12px] font-semibold cursor-pointer shadow-sm select-none ring-2 transition-all ${showMenu ? 'ring-blush-400' : 'ring-transparent hover:ring-blush-300'}`}
        >
          E
        </button>

        {showMenu && (
          <div className="absolute right-0 top-9 w-44 bg-white dark:bg-mauve-800 rounded-2xl shadow-modal border border-black/[0.06] dark:border-white/[0.05] overflow-hidden z-50 animate-menu-in">
            <button
              onClick={() => { toggle(); setShowMenu(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-plum-800 dark:text-mauve-100 hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors"
            >
              {theme === 'dark'
                ? <Sun size={14} strokeWidth={1.8} className="text-mauve-400" />
                : <Moon size={14} strokeWidth={1.8} className="text-mauve-400" />
              }
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <div className="h-px bg-black/[0.05] dark:bg-white/[0.05]" />
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
              <LogOut size={14} strokeWidth={1.8} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
