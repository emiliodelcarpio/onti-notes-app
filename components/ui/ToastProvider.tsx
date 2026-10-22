'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Icon from './Icon'

type Toast = {
  id: number
  title: string
  message: string
}

type ToastContextValue = {
  showToast: (title: string, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)
const TOAST_DURATION = 8000

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast debe utilizarse dentro de ToastProvider.')
  }

  return context
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const nextId = useRef(0)
  const countdown = useRef({ id: 0, remaining: TOAST_DURATION })

  const showToast = useCallback((title: string, message: string) => {
    nextId.current += 1
    setToast({ id: nextId.current, title, message })
  }, [])

  const closeToast = useCallback(() => {
    setToast(null)
    setIsHovered(false)
    setIsFocused(false)
  }, [])

  useEffect(() => {
    if (!toast) return

    if (countdown.current.id !== toast.id) {
      countdown.current = { id: toast.id, remaining: TOAST_DURATION }
    }

    if (isHovered || isFocused) return

    const startedAt = Date.now()
    const timer = setTimeout(closeToast, countdown.current.remaining)

    return () => {
      clearTimeout(timer)
      countdown.current.remaining = Math.max(
        0,
        countdown.current.remaining - (Date.now() - startedAt),
      )
    }
  }, [toast, isHovered, isFocused, closeToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-4 top-4 z-50 mx-auto max-w-sm sm:left-auto sm:right-6 sm:top-6 sm:mx-0 sm:w-full"
      >
        {toast && (
          <div
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-success-border bg-success-surface p-4 shadow-(--toast-shadow)"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocusCapture={() => setIsFocused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsFocused(false)
              }
            }}
          >
            <Icon name="check-circle" className="mt-0.5 size-6 text-success" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-6 text-success">{toast.title}</p>
              <p className="mt-1 text-sm leading-6 text-success-detail">{toast.message}</p>
            </div>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={closeToast}
              className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
