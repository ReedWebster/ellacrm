import { useState } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/layout/Layout'
import DailyBrief from './components/dashboard/DailyBrief'
import CalendarView from './components/calendar/CalendarView'
import HabitsView from './components/habits/HabitsView'
import TodosView from './components/todos/TodosView'
import GoalsView from './components/goals/GoalsView'
import NotesView from './components/notes/NotesView'
import AcademicsView from './components/academics/AcademicsView'
import DocHubView from './components/docs/DocHubView'
import type { ViewKey } from './lib/types'

function AppContent() {
  const [activeView, setActiveView] = useState<ViewKey>('dashboard')

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DailyBrief />
      case 'calendar': return <CalendarView />
      case 'habits': return <HabitsView />
      case 'todos': return <TodosView />
      case 'goals': return <GoalsView />
      case 'notes': return <NotesView />
      case 'academics': return <AcademicsView />
      case 'docs': return <DocHubView />
      default: return <DailyBrief />
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
      <AppContent />
    </ThemeProvider>
  )
}
