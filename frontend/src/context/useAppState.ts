import { useContext } from 'react'
import { AppStateContext } from './appStateContextValue'

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('AppStateContext is missing')
  }
  return context
}
