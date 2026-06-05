import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AppStateProvider } from './context/AppStateContext'
import { ProtectedLayout } from './components/ProtectedLayout'
import { CalendarPage } from './pages/CalendarPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MessagePage } from './pages/MessagePage'
import { MansaePastePage } from './pages/MansaePastePage'
import { RootRedirect } from './pages/RootRedirect'
import { TeammateCreatePage } from './pages/TeammateCreatePage'
import { TeammateDetailPage } from './pages/TeammateDetailPage'

function App() {
  return (
    <AppStateProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/teammates/new" element={<TeammateCreatePage />} />
          <Route path="/teammates/:teammateId" element={<TeammateDetailPage />} />
          <Route path="/messages/:teammateId" element={<MessagePage />} />
          <Route path="/mansae/:teammateId" element={<MansaePastePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppStateProvider>
  )
}

export default App
