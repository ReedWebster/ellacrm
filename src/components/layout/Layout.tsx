import { useState } from 'react'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import BottomNav from './BottomNav'
import type { ViewKey } from '@/lib/types'

interface LayoutProps {
  activeView: ViewKey
  onNavigate: (view: ViewKey) => void
  children: React.ReactNode
}

export default function Layout({ activeView, onNavigate, children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-[100dvh] bg-blush-50 dark:bg-mauve-900 overflow-hidden">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar
          activeView={activeView}
          onNavigate={onNavigate}
          collapsed={sidebarCollapsed}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav
          activeView={activeView}
          onToggleSidebar={() => setSidebarCollapsed(c => !c)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[calc(1rem+60px+env(safe-area-inset-bottom))] md:pb-6">
          <div key={activeView} className="animate-view-in">
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
