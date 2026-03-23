import { useState, useRef, useEffect } from 'react'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import BottomNav from './BottomNav'
import type { ViewKey } from '@/lib/types'

interface LayoutProps {
  activeView: ViewKey
  onNavigate: (view: ViewKey) => void
  children: React.ReactNode
}

const VIEW_ORDER: ViewKey[] = ['dashboard', 'calendar', 'habits', 'todos', 'goals', 'notes', 'academics', 'docs', 'solitaire']

export default function Layout({ activeView, onNavigate, children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const prevViewRef = useRef<ViewKey>(activeView)
  const [transitionClass, setTransitionClass] = useState('animate-view-in')

  useEffect(() => {
    const prevIdx = VIEW_ORDER.indexOf(prevViewRef.current)
    const currIdx = VIEW_ORDER.indexOf(activeView)
    if (prevViewRef.current !== activeView) {
      setTransitionClass(currIdx > prevIdx ? 'animate-slide-left' : 'animate-slide-right')
      prevViewRef.current = activeView
    }
  }, [activeView])

  return (
    <div className="flex h-[100dvh] bg-blush-50 dark:bg-mauve-900 overflow-hidden">
      {/* Richer dark mode background gradient */}
      <div className="fixed inset-0 pointer-events-none dark:bg-[radial-gradient(ellipse_at_center,_theme(colors.mauve.800)_0%,_theme(colors.mauve.900)_70%)] opacity-0 dark:opacity-100 transition-opacity" />

      {/* Sidebar — desktop only */}
      <div className="hidden md:flex relative z-10">
        <Sidebar
          activeView={activeView}
          onNavigate={onNavigate}
          collapsed={sidebarCollapsed}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative z-10">
        <TopNav
          activeView={activeView}
          onToggleSidebar={() => setSidebarCollapsed(c => !c)}
        />
        <main className="flex-1 overflow-y-auto p-5 sm:p-6 pb-[calc(1rem+60px+env(safe-area-inset-bottom))] md:pb-6">
          <div key={activeView} className={transitionClass}>
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <div className="md:hidden">
        <BottomNav activeView={activeView} onNavigate={onNavigate} />
      </div>
    </div>
  )
}
