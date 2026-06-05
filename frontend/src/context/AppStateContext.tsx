import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { usePersistentState } from '../usePersistentState'
import type {
  AppEvent,
  AppMessage,
  Teammate,
  UserProfile,
} from '../types'
import {
  createId,
  createSeedEvents,
  createSeedMessages,
  createSeedTeammates,
  createTeammate,
  createUserProfile,
  nowIso,
  sortEvents,
  storageKeys,
} from '../lib/appModel'
import { AppStateContext } from './appStateContextValue'
import type { AppState } from './appStateContextValue'

export function AppStateProvider(props: { children: ReactNode }) {
  const seedTeammates = useMemo(() => createSeedTeammates(), [])
  const [currentUser, setCurrentUser] = usePersistentState<UserProfile | null>(
    storageKeys.user,
    null,
  )
  const [teammates, setTeammates] = usePersistentState<Teammate[]>(
    storageKeys.teammates,
    seedTeammates,
  )
  const [messagesByTeammate, setMessagesByTeammate] = usePersistentState<
    Record<string, AppMessage[]>
  >(storageKeys.messages, createSeedMessages(seedTeammates))
  const [events, setEvents] = usePersistentState<AppEvent[]>(
    storageKeys.events,
    createSeedEvents(seedTeammates),
  )

  const value = useMemo<AppState>(
    () => ({
      currentUser,
      teammates,
      messagesByTeammate,
      events,
      login(form) {
        setCurrentUser(createUserProfile(form))
      },
      logout() {
        setCurrentUser(null)
      },
      addTeammate(form) {
        const teammate = createTeammate(form)
        setTeammates((previous) => [teammate, ...previous])
        setMessagesByTeammate((previous) => ({
          ...previous,
          [teammate.id]: [
            {
              id: createId('message'),
              teammateId: teammate.id,
              sender: teammate.name,
              body: teammate.analysis.messageOpening,
              sentAt: nowIso(),
            },
          ],
        }))
        return teammate
      },
      deleteTeammate(id) {
        setTeammates((previous) => previous.filter((item) => item.id !== id))
        setMessagesByTeammate((previous) => {
          const next = { ...previous }
          delete next[id]
          return next
        })
        setEvents((previous) => previous.filter((event) => event.teammateId !== id))
      },
      sendMessage(teammateId, body) {
        setMessagesByTeammate((previous) => ({
          ...previous,
          [teammateId]: [
            ...(previous[teammateId] ?? []),
            {
              id: createId('message'),
              teammateId,
              sender: currentUser?.name ?? 'You',
              body,
              sentAt: nowIso(),
            },
          ],
        }))
      },
      addEvent(input) {
        setEvents((previous) => sortEvents([{ id: createId('event'), ...input }, ...previous]))
      },
      deleteEvent(eventId) {
        setEvents((previous) => previous.filter((event) => event.id !== eventId))
      },
    }),
    [currentUser, events, messagesByTeammate, setCurrentUser, setEvents, setMessagesByTeammate, setTeammates, teammates],
  )

  return <AppStateContext.Provider value={value}>{props.children}</AppStateContext.Provider>
}
