import { createContext } from 'react'
import type {
  AppEvent,
  AppMessage,
  LoginForm,
  Teammate,
  TeammateForm,
  UserProfile,
} from '../types'

export type AppState = {
  currentUser: UserProfile | null
  teammates: Teammate[]
  messagesByTeammate: Record<string, AppMessage[]>
  events: AppEvent[]
  login: (form: LoginForm) => void
  logout: () => void
  addTeammate: (form: TeammateForm) => Teammate
  deleteTeammate: (id: string) => void
  sendMessage: (teammateId: string, body: string) => void
  addEvent: (input: Omit<AppEvent, 'id'>) => void
  deleteEvent: (eventId: string) => void
}

export const AppStateContext = createContext<AppState | null>(null)
