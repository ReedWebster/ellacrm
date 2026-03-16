import { useState } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-blush-50 dark:bg-mauve-900 flex items-center justify-center">
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
