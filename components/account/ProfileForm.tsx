'use client'

import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { updateProfile } from '@/actions/profile'
import Button from '@/components/ui/Button'
import FeedbackMessage from '@/components/ui/FeedbackMessage'
import { useToast } from '@/components/ui/ToastProvider'
import type { Profile } from '@/types/profile'

type FieldName = 'full_name' | 'avatar_url'
type Values = Record<FieldName, string>
type Errors = Partial<Record<FieldName, string>>

function validate(values: Values): Errors {
  const errors: Errors = {}
  if (values.full_name.trim().length > 80) {
    errors.full_name = 'Usa un nombre de hasta 80 caracteres.'
  }
  const avatar = values.avatar_url.trim()
  if (avatar) {
    try {
      const url = new URL(avatar)
      if (avatar.length > 2048 || url.protocol !== 'https:' || url.username || url.password) {
        errors.avatar_url = 'Introduce una dirección HTTPS válida, sin credenciales.'
      }
    } catch {
      errors.avatar_url = 'Introduce una dirección HTTPS válida.'
    }
  }
  return errors
}

const fields: { name: FieldName; label: string; placeholder: string; maxLength: number; help?: string }[] = [
  { name: 'full_name', label: 'Nombre visible (opcional)', placeholder: '¿Cómo quieres que te llamemos?', maxLength: 80 },
  { name: 'avatar_url', label: 'Imagen de perfil (opcional)', placeholder: 'https://ejemplo.com/tu-imagen.jpg', maxLength: 2048, help: 'Dirección HTTPS de una imagen. Si no está disponible, mostraremos tus iniciales.' },
]

export default function ProfileForm({ profile, email, onSaved, onCancel, onBusyChange }: {
  profile: Profile
  email: string
  onSaved: () => void
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const { showToast } = useToast()
  const lock = useRef(false)
  const [pending, setPending] = useState(false)
  const [values, setValues] = useState<Values>({
    full_name: profile.full_name ?? '',
    avatar_url: profile.avatar_url ?? '',
  })
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [error, setError] = useState<string>()
  const errors = validate(values)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    setError(undefined)
    setTouched({ full_name: true, avatar_url: true })
    const invalidField = fields.find(({ name }) => errors[name])
    if (invalidField) {
      const input = event.currentTarget.elements.namedItem(invalidField.name)
      if (input instanceof HTMLInputElement) input.focus()
      return
    }
    const data = new FormData(event.currentTarget)
    lock.current = true
    setPending(true)
    onBusyChange(true)
    let saved = false
    try {
      const result = await updateProfile(data)
      if (!result.success) {
        setError(result.error ?? 'No pudimos guardar tu perfil. Inténtalo de nuevo.')
      } else {
        saved = true
      }
    } catch {
      setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      lock.current = false
      setPending(false)
      onBusyChange(false)
    }
    if (saved) {
      showToast('Perfil actualizado', 'Tus cambios se han guardado correctamente.')
      onSaved()
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={pending}>
      <div role="alert" aria-atomic="true">
        {error && <FeedbackMessage icon="alert-circle" tone="error" className="mb-5">{error}</FeedbackMessage>}
      </div>
      <fieldset disabled={pending} className="space-y-5">
        <div>
          <label htmlFor="profile-email" className="text-sm font-medium">Correo electrónico</label>
          <input id="profile-email" type="email" readOnly value={email} autoComplete="email" className="mt-2 min-h-11 w-full rounded-(--radius-control) border border-border bg-surface-highlight px-3 text-sm text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" />
        </div>
        {fields.map(({ name, label, placeholder, maxLength, help }) => {
          const fieldError = touched[name] ? errors[name] : undefined
          return (
            <div key={name}>
              <label htmlFor={`profile-${name}`} className="text-sm font-medium">{label}</label>
              <input
                id={`profile-${name}`}
                name={name}
                type={name === 'avatar_url' ? 'url' : 'text'}
                autoComplete={name === 'full_name' ? 'name' : 'off'}
                autoCapitalize={name === 'full_name' ? 'words' : 'none'}
                spellCheck={name === 'full_name'}
                maxLength={maxLength}
                placeholder={placeholder}
                value={values[name]}
                onChange={(event) => {
                  setValues((current) => ({ ...current, [name]: event.target.value }))
                  setError(undefined)
                }}
                onBlur={() => setTouched((current) => ({ ...current, [name]: true }))}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={[help ? `profile-${name}-help` : '', fieldError ? `profile-${name}-error` : ''].filter(Boolean).join(' ') || undefined}
                className={`mt-2 min-h-11 w-full rounded-(--radius-control) border px-3 text-sm text-foreground placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${fieldError ? 'border-danger bg-danger-surface/30' : 'border-input-border bg-input'}`}
              />
              {help && <p id={`profile-${name}-help`} className="mt-2 text-xs leading-5 text-muted">{help}</p>}
              <p id={`profile-${name}-error`} aria-live="polite" className={`text-xs leading-5 text-danger ${fieldError ? 'mt-1.5' : ''}`}>{fieldError}</p>
            </div>
          )
        })}
      </fieldset>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>Cancelar</Button>
        <Button type="submit" pending={pending}>{pending ? 'Guardando…' : 'Guardar cambios'}</Button>
      </div>
    </form>
  )
}
