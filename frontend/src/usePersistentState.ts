import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

export function usePersistentState<T>(
  key: string,
  initialValue: T | (() => T),
) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return typeof initialValue === 'function'
        ? (initialValue as () => T)()
        : initialValue
    }

    const saved = window.localStorage.getItem(key)
    if (!saved) {
      return typeof initialValue === 'function'
        ? (initialValue as () => T)()
        : initialValue
    }

    try {
      return JSON.parse(saved) as T
    } catch {
      return typeof initialValue === 'function'
        ? (initialValue as () => T)()
        : initialValue
    }
  })

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])

  return [state, setState] as [T, Dispatch<SetStateAction<T>>]
}
