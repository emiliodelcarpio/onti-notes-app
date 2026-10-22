'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { logout } from '@/actions/auth'
import Icon from '@/components/ui/Icon'
import FeedbackMessage from '@/components/ui/FeedbackMessage'

export default function LogoutButton() {
  const router = useRouter()
  const lock = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  async function signOut() {
    if (lock.current) return
    lock.current = true
    setPending(true)
    setError(undefined)
    try {
      const result = await logout()
      if (!result.success) { setError(result.error); return }
      router.replace('/login')
      router.refresh()
    } catch {
      setError('No pudimos cerrar la sesión. Inténtalo de nuevo.')
    } finally {
      lock.current = false
      setPending(false)
    }
  }
  return <div>
    <button onClick={signOut} disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60">
      <Icon name={pending ? 'loader' : 'logout'} className={pending ? 'motion-safe:animate-spin' : undefined} />
      {pending ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
    <div role="alert" aria-atomic="true">
      {error && <FeedbackMessage icon="alert-circle" tone="error" className="mt-3">{error}</FeedbackMessage>}
    </div>
  </div>
}
