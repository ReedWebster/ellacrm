import { useEffect, useState } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { syncFromGoogle } from './lib/calendarSync'
import LoginScreen from './components/auth/LoginScreen'
import Layout from './components/layout/Layout'
import DailyBrief from './components/dashboard/DailyBrief'
import CalendarView from './components/calendar/CalendarView'
import HabitsView from './components/habits/HabitsView'
import TodosView from './components/todos/TodosView'
import GoalsView from './components/goals/GoalsView'
import NotesView from './components/notes/NotesView'
import AcademicsView from './components/academics/AcademicsView'
import DocHubView from './components/docs/DocHubView'
import SolitaireView from './components/solitaire/SolitaireView'
import type { ViewKey } from './lib/types'

function AppContent() {
  const { user, loading } = useAuth()
  const [activeView, setActiveView] = useState<ViewKey>('dashboard')
  const [oauthBanner, setOauthBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // Handle OAuth callback redirect from google-oauth-callback Edge Function
  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(window.location.search)
    if (params.has('google_connected')) {
      setOauthBanner({ kind: 'success', text: 'Google Calendar connected. Syncing…' })
      setActiveView('calendar')
      syncFromGoogle().then(r => {
        setOauthBanner(r
          ? { kind: 'success', text: `Synced ${r.upserts} events from Google.` }
          : { kind: 'error', text: 'Initial sync failed. Try Sync now.' })
        setTimeout(() => setOauthBanner(null), 4000)
      })
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.has('google_error')) {
      setOauthBanner({ kind: 'error', text: `Google: ${params.get('google_error')}` })
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => setOauthBanner(null), 6000)
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-linen-50 dark:bg-ink-900 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blush-300 border-t-blush-500 animate-spin" />
      </div>
    )
  }

  if (!user) return <LoginScreen />

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DailyBrief />
      case 'calendar':  return <CalendarView />
      case 'habits':    return <HabitsView />
      case 'todos':     return <TodosView />
      case 'goals':     return <GoalsView />
      case 'notes':     return <NotesView />
      case 'academics': return <AcademicsView />
      case 'docs':      return <DocHubView />
      case 'solitaire': return <SolitaireView />
      default:          return <DailyBrief />
    }
  }

  return (
    <Layout activeView={activeView} onNavigate={setActiveView}>
      {oauthBanner && (
        <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm font-medium ${
          oauthBanner.kind === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
        }`}>
          {oauthBanner.text}
        </div>
      )}
      {renderView()}
    </Layout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}
