'use client'

import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { updateProfile } from '@/actions/profile'
import Button from '@/components/ui/Button'
import FeedbackMessage from '@/components/ui/FeedbackMessage'
import { useToast } from '@/components/ui/ToastProvider'
import type { Profile } from '@/types/profile'
import AvatarForm from './AvatarForm'

type Operation = 'profile' | 'avatar'

export default function ProfileForm({ profile, email, onCancel, onBusyChange }: {
  profile: Profile
  email: string
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const { showToast } = useToast()
  const operation = useRef<Operation | null>(null)
  const [pending, setPending] = useState<Operation | null>(null)
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const fieldError = fullName.trim().length > 80 ? 'Usa un nombre de hasta 80 caracteres.' : ''
  const busy = pending !== null

  function begin(nextOperation: Operation) {
    // Both forms share a synchronous lock so a photo and name cannot submit together.
    if (operation.current) return false
    operation.current = nextOperation
    setPending(nextOperation)
    onBusyChange(true)
    return true
  }

  function finish(completedOperation: Operation) {
    if (operation.current !== completedOperation) return
    operation.current = null
    setPending(null)
    onBusyChange(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (operation.current) return
    setTouched(true)
    setError('')
    setMessage('')
    if (fieldError) {
      event.currentTarget.querySelector<HTMLInputElement>('#profile-full_name')?.focus()
      return
    }
    const data = new FormData(event.currentTarget)
    if (!begin('profile')) return
    try {
      const result = await updateProfile(data)
      if (!result.success) {
        setError(result.error ?? 'No pudimos guardar tu perfil. Inténtalo de nuevo.')
        return
      }
      setFullName(fullName.trim())
      setMessage('Tus datos se han guardado correctamente.')
      showToast('Perfil actualizado', 'Tus datos se han guardado. La foto se gestiona por separado.')
    } catch {
      setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      finish('profile')
    }
  }

  return <div className="space-y-6">
    <AvatarForm avatarUrl={profile.avatar_url} name={fullName || email.split('@')[0] || 'Mi cuenta'} disabled={busy}
      onRequestStart={() => begin('avatar')} onRequestEnd={() => finish('avatar')} />
    <section aria-labelledby="profile-data-title">
      <h3 id="profile-data-title" className="text-sm font-semibold">Datos del perfil</h3>
      <form onSubmit={submit} noValidate aria-busy={pending === 'profile'} className="mt-4">
        {error && <div role="alert"><FeedbackMessage icon="alert-circle" tone="error" className="mb-5">{error}</FeedbackMessage></div>}
        <fieldset disabled={busy} className="space-y-5">
          <div>
            <label htmlFor="profile-email" className="text-sm font-medium">Correo electrónico</label>
            <input id="profile-email" type="email" readOnly value={email} autoComplete="email" className="mt-2 min-h-11 w-full rounded-(--radius-control) border border-border bg-surface-highlight px-3 text-sm text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" />
          </div>
          <div>
            <label htmlFor="profile-full_name" className="text-sm font-medium">Nombre visible (opcional)</label>
            <input id="profile-full_name" name="full_name" type="text" autoComplete="name" autoCapitalize="words" maxLength={80}
              value={fullName} placeholder="¿Cómo quieres que te llamemos?" onChange={(event) => { setFullName(event.target.value); setError(''); setMessage('') }} onBlur={() => setTouched(true)}
              aria-invalid={touched && Boolean(fieldError)} aria-describedby={touched && fieldError ? 'profile-name-error' : undefined}
              className={`mt-2 min-h-11 w-full rounded-(--radius-control) border px-3 text-sm text-foreground placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${touched && fieldError ? 'border-danger bg-danger-surface/30' : 'border-input-border bg-input'}`} />
            {touched && fieldError && <p id="profile-name-error" role="alert" className="mt-1.5 text-xs leading-5 text-danger">{fieldError}</p>}
          </div>
        </fieldset>
        {message && <p role="status" className="mt-3 text-xs leading-5 text-success">{message}</p>}
        <div className="mt-5 flex justify-end">
          <Button type="submit" pending={pending === 'profile'} disabled={busy}>{pending === 'profile' ? 'Guardando datos…' : 'Guardar datos'}</Button>
        </div>
      </form>
    </section>
    <div className="flex justify-end border-t border-border pt-4"><Button variant="secondary" onClick={onCancel} disabled={busy}>Cerrar</Button></div>
  </div>
}
