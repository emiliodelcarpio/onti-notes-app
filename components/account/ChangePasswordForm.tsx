'use client'

import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { updatePassword } from '@/actions/auth'
import PasswordInput from '@/components/auth/PasswordInput'
import Button from '@/components/ui/Button'
import FeedbackMessage from '@/components/ui/FeedbackMessage'
import { useToast } from '@/components/ui/ToastProvider'

type Field = 'password' | 'confirmPassword'

export default function ChangePasswordForm({ onSaved, onCancel, onBusyChange }: {
  onSaved: () => void
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const { showToast } = useToast()
  const lock = useRef(false)
  const [pending, setPending] = useState(false)
  const [values, setValues] = useState({ password: '', confirmPassword: '' })
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [error, setError] = useState<string>()
  const errors = {
    password: values.password.length < 8 || values.password.length > 128
      ? 'Usa una contraseña de entre 8 y 128 caracteres.' : undefined,
    confirmPassword: !values.confirmPassword ? 'Confirma tu nueva contraseña.'
      : values.password !== values.confirmPassword ? 'Las contraseñas no coinciden.' : undefined,
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    setError(undefined)
    setTouched({ password: true, confirmPassword: true })
    const firstInvalid = (['password', 'confirmPassword'] satisfies Field[]).find((field) => errors[field])
    if (firstInvalid) {
      const input = event.currentTarget.elements.namedItem(firstInvalid)
      if (input instanceof HTMLInputElement) input.focus()
      return
    }
    const data = new FormData(event.currentTarget)
    lock.current = true
    setPending(true)
    onBusyChange(true)
    let saved = false
    try {
      const result = await updatePassword(data)
      if (!result.success) {
        setError(result.error ?? 'No pudimos cambiar tu contraseña. Inténtalo de nuevo.')
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
      setValues({ password: '', confirmPassword: '' })
      showToast('Contraseña actualizada', 'Usa tu nueva contraseña la próxima vez que inicies sesión.')
      onSaved()
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={pending}>
      <div role="alert" aria-atomic="true">
        {error && <FeedbackMessage icon="alert-circle" tone="error" className="mb-5">{error}</FeedbackMessage>}
      </div>
      <fieldset disabled={pending} className="space-y-5">
        {(['password', 'confirmPassword'] satisfies Field[]).map((field) => (
          <PasswordInput
            key={field}
            id={`account-${field}`}
            name={field}
            label={field === 'password' ? 'Nueva contraseña' : 'Confirmar contraseña'}
            placeholder={field === 'password' ? 'Mínimo 8 caracteres' : 'Repite tu nueva contraseña'}
            autoComplete="new-password"
            value={values[field]}
            onChange={(value) => {
              setValues((current) => ({ ...current, [field]: value }))
              setError(undefined)
            }}
            onBlur={() => setTouched((current) => ({ ...current, [field]: true }))}
            error={touched[field] ? errors[field] : undefined}
            disabled={pending}
            showStrength={field === 'password'}
          />
        ))}
      </fieldset>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>Cancelar</Button>
        <Button type="submit" pending={pending}>{pending ? 'Guardando…' : 'Guardar contraseña'}</Button>
      </div>
    </form>
  )
}
