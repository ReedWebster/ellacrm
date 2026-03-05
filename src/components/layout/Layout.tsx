import { useState } from 'react'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import type { ViewKey } from '@/lib/types'

interface LayoutProps {
  activeView: ViewKey
  onNavigate: (view: ViewKey) => void
  children: React.ReactNode
}

export default function Layout({ activeView, onNavigate, children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-blush-50 dark:bg-mauve-900 overflow-hidden">
      <Sidebar
        activeView={activeView}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav
          activeView={activeView}
          onToggleSidebar={() => setSidebarCollapsed(c => !c)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
