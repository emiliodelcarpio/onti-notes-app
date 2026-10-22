'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { ThemePreference } from '@/types/profile'

type ThemeContextValue = { preference: ThemePreference; setPreference: (preference: ThemePreference) => void }
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme debe utilizarse dentro de ThemeProvider.')
  return context
}

export default function ThemeProvider({ initialPreference, children }: { initialPreference: ThemePreference; children: ReactNode }) {
  const [state, setState] = useState({ source: initialPreference, value: initialPreference })
  if (state.source !== initialPreference) setState({ source: initialPreference, value: initialPreference })

  const setPreference = useCallback((preference: ThemePreference) => {
    document.documentElement.dataset.theme = preference
    setState({ source: initialPreference, value: preference })
  }, [initialPreference])

  useEffect(() => { document.documentElement.dataset.theme = state.value }, [state.value])

  return <ThemeContext.Provider value={{ preference: state.value, setPreference }}>{children}</ThemeContext.Provider>
}
