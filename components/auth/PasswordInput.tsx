'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Icon from '@/components/ui/Icon'

type PasswordInputProps = {
  id: string
  name: string
  label: string
  labelAction?: ReactNode
  placeholder?: string
  autoComplete: 'new-password' | 'current-password'
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  error?: string
  disabled?: boolean
  showStrength?: boolean
}

function getPasswordGuidance(value: string) {
  if (!value) return { level: 0, description: 'Aún no has escrito una contraseña.' }
  if (value.length < 8) return { level: 1, description: 'Menos de 8 caracteres.' }

  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/]
    .filter((pattern) => pattern.test(value)).length

  if (value.length >= 12 && variety >= 3) {
    return { level: 3, description: 'Al menos 12 caracteres con distintos tipos de caracteres.' }
  }

  return { level: 2, description: 'Al menos 8 caracteres. Puedes aumentar la longitud y la variedad.' }
}

export default function PasswordInput({
  id,
  name,
  label,
  labelAction,
  placeholder,
  autoComplete,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  showStrength = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const guidance = getPasswordGuidance(value)
  const showHelp = autoComplete === 'new-password' && showStrength
  const describedBy = [
    error ? `${id}-error` : undefined,
    showHelp ? `${id}-help` : undefined,
    showStrength ? `${id}-strength` : undefined,
  ].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium">{label}</label>
        {labelAction}
      </div>
      <div className="relative mt-2">
        <Icon name="lock" className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 ${error ? 'text-danger' : 'text-input-icon'}`} />
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          required
          minLength={autoComplete === 'new-password' ? 8 : 1}
          maxLength={128}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`min-h-11 w-full rounded-(--radius-control) border pl-10 pr-12 text-sm text-foreground placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${error ? 'border-danger bg-danger-surface/30' : 'border-input-border bg-input'}`}
        />
        <button
          type="button"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          aria-controls={id}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-0 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-(--radius-control) text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name={visible ? 'eye-off' : 'eye'} className="size-4" />
        </button>
      </div>
      {showStrength && (
        <>
          <div
            role="meter"
            aria-label="Orientación de contraseña"
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={guidance.level}
            aria-valuetext={guidance.description}
            className="mt-2 flex gap-1.5"
          >
            {[1, 2, 3].map((segment) => (
              <span
                key={segment}
                aria-hidden="true"
                className={`h-1 flex-1 rounded-full ${guidance.level >= segment ? 'bg-success' : 'bg-strength-track'}`}
              />
            ))}
          </div>
          <p id={`${id}-strength`} className="sr-only">Longitud y variedad: {guidance.description}</p>
        </>
      )}
      <p id={`${id}-error`} aria-live="polite" className={`text-xs leading-5 text-danger ${error ? 'mt-1.5' : ''}`}>{error}</p>
      {showHelp && <p id={`${id}-help`} className="mt-2 text-xs leading-5 text-muted">Entre 8 y 128 caracteres. Usa una contraseña única.</p>}
    </div>
  )
}
