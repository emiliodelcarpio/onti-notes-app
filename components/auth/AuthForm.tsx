'use client'

import { useRef, useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AuthResult } from '@/types/auth'
import Icon from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import FeedbackMessage from '@/components/ui/FeedbackMessage'
import { useToast } from '@/components/ui/ToastProvider'
import PasswordInput from './PasswordInput'

type Mode = 'login' | 'register' | 'forgot' | 'update'
type FieldName = 'email' | 'password' | 'confirmPassword'
type FormValues = Record<FieldName, string>
type FieldErrors = Partial<Record<FieldName, string>>

const emptyValues: FormValues = { email: '', password: '', confirmPassword: '' }
const labels = {
  login: ['Iniciar sesión', 'Validando…'],
  register: ['Crear cuenta', 'Creando cuenta…'],
  forgot: ['Solicitar enlace', 'Preparando…'],
  update: ['Guardar contraseña', 'Guardando…'],
}
const actionIcons: Record<Mode, IconName> = {
  login: 'login',
  register: 'user-plus',
  forgot: 'mail',
  update: 'shield',
}
const linkClass = 'inline-flex min-h-11 items-center gap-2 rounded text-xs font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent'

function validateFields(values: FormValues, mode: Mode): FieldErrors {
  const errors: FieldErrors = {}
  if (mode !== 'update') {
    const email = values.email.trim()
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Introduce un correo electrónico válido.'
    }
  }
  if (mode !== 'forgot') {
    if (!values.password) errors.password = 'La contraseña es obligatoria.'
    else if (values.password.length > 128) errors.password = 'Usa un máximo de 128 caracteres.'
    else if (mode !== 'login' && values.password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres.'
    }
  }
  if (mode === 'register' || mode === 'update') {
    if (!values.confirmPassword) errors.confirmPassword = 'Confirma tu contraseña.'
    else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden.'
    }
  }
  return errors
}

export default function AuthForm({ mode, action }: {
  mode: Mode; action: (data: FormData) => Promise<AuthResult>
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const lock = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [navigating, startTransition] = useTransition()
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState(false)
  const pending = submitting || navigating
  const isNewPassword = mode === 'register' || mode === 'update'
  const validationErrors = validateFields(values, mode)
  const fieldErrors: FieldErrors = {
    email: touched.email ? validationErrors.email : undefined,
    password: touched.password ? validationErrors.password : undefined,
    confirmPassword: touched.confirmPassword ? validationErrors.confirmPassword : undefined,
  }
  const hasVisibleErrors = Object.values(fieldErrors).some(Boolean)

  function changeValue(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setError(undefined)
    setSuccess(false)
  }

  function touchField(field: FieldName) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || pending) return
    const form = event.currentTarget
    setError(undefined)
    setTouched({ email: true, password: true, confirmPassword: true })
    const firstInvalidField = (['email', 'password', 'confirmPassword'] satisfies FieldName[])
      .find((field) => validationErrors[field])
    if (firstInvalidField) {
      const input = form.elements.namedItem(firstInvalidField)
      if (input instanceof HTMLInputElement) input.focus()
      return
    }
    const data = new FormData(form)
    lock.current = true
    setSubmitting(true)
    setSuccess(false)
    let leaving = false
    try {
      const result = await action(data)
      if (!result.success) {
        setError(result.error ?? 'No pudimos completar la solicitud. Inténtalo de nuevo.')
        return
      }
      setValues(emptyValues)
      setTouched({})
      if (mode === 'login' || mode === 'register' || mode === 'update') {
        if (mode === 'login') {
          showToast('¡Bienvenido de nuevo!', 'Has iniciado sesión en tu espacio personal.')
        } else if (mode === 'register') {
          showToast('Registro completado', 'Revisa tu correo para confirmar tu cuenta cuando sea necesario. Si ya tenías una cuenta, puedes iniciar sesión.')
        } else {
          showToast('Contraseña actualizada', 'Ya puedes iniciar sesión con tu nueva contraseña.')
        }
        leaving = true
        startTransition(() => {
          router.replace(mode === 'register' ? '/login?registered=1' : mode === 'update' ? '/login?password-updated=1' : '/')
          if (mode !== 'register') router.refresh()
        })
      } else {
        setSuccess(true)
      }
    } catch {
      setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      if (!leaving) {
        lock.current = false
        setSubmitting(false)
      }
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={pending}>
      <div role="alert" aria-atomic="true">
        {error && <FeedbackMessage icon="alert-circle" tone="error" className="mb-5">{error}</FeedbackMessage>}
      </div>
      <div role="status" aria-atomic="true">
        {success && <FeedbackMessage
          icon="check-circle"
          tone="success"
          title="Solicitud completada"
          className="mb-5"
        >
          Si existe una cuenta asociada y la solicitud puede procesarse, recibirás un enlace con las instrucciones. Revisa también la carpeta de spam.
        </FeedbackMessage>}
      </div>
      <fieldset disabled={pending} className="space-y-4">
        {mode !== 'update' && <div>
          <label htmlFor="email" className="text-xs font-medium">Correo electrónico</label>
          <div className="relative mt-2">
            <Icon name="mail" className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${fieldErrors.email ? 'text-danger' : 'text-input-icon'}`} />
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="nombre@ejemplo.com"
              required
              maxLength={254}
              value={values.email}
              onChange={(event) => changeValue('email', event.target.value)}
              onBlur={() => touchField('email')}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              className={`min-h-11 w-full rounded-(--radius-control) border pl-10 pr-3 text-sm text-foreground placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${fieldErrors.email ? 'border-danger bg-danger-surface/30' : 'border-input-border bg-input'}`}
            />
          </div>
          <p id="email-error" aria-live="polite" className={`text-xs leading-5 text-danger ${fieldErrors.email ? 'mt-1.5' : ''}`}>{fieldErrors.email}</p>
        </div>}
        {mode !== 'forgot' && <PasswordInput
          id="password"
          name="password"
          label={isNewPassword ? 'Nueva contraseña' : 'Contraseña'}
          labelAction={mode === 'login' ? <Link href="/forgot-password" className="rounded py-1 text-xs font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">¿La olvidaste?</Link> : undefined}
          placeholder={isNewPassword ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
          autoComplete={isNewPassword ? 'new-password' : 'current-password'}
          value={values.password}
          onChange={(value) => changeValue('password', value)}
          onBlur={() => touchField('password')}
          error={fieldErrors.password}
          disabled={pending}
          showStrength={isNewPassword}
        />}
        {isNewPassword && <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirmar contraseña"
          placeholder="Repite tu contraseña"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(value) => changeValue('confirmPassword', value)}
          onBlur={() => touchField('confirmPassword')}
          error={fieldErrors.confirmPassword}
          disabled={pending}
        />}
        <button
          type="submit"
          disabled={pending || hasVisibleErrors}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-(--radius-control) bg-linear-to-b from-primary-from to-primary-to px-4 text-sm font-semibold text-on-accent shadow-(--primary-shadow) transition-[filter,box-shadow] enabled:hover:brightness-(--primary-hover-brightness) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:from-primary-disabled-bg disabled:to-primary-disabled-bg disabled:text-primary-disabled-text disabled:shadow-none motion-reduce:transition-none"
        >
          <Icon name={pending ? 'loader' : actionIcons[mode]} className={`size-4 ${pending ? 'motion-safe:animate-spin' : ''}`} />
          {labels[mode][pending ? 1 : 0]}
        </button>
      </fieldset>
      <nav aria-label="Opciones de acceso" className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {mode !== 'login' && <Link href="/login" className={linkClass}><Icon name="login" className="size-4" />Iniciar sesión</Link>}
        {mode === 'login' && <Link href="/register" className={linkClass}><Icon name="user-plus" className="size-4" />Crear cuenta</Link>}
        {(mode === 'login' || mode === 'update') && <Link href="/forgot-password" className={linkClass}><Icon name="key" className="size-4" />Recuperar contraseña</Link>}
      </nav>
    </form>
  )
}
