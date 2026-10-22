'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { logout } from '@/actions/auth'
import { updateThemePreference } from '@/actions/profile'
import FeedbackMessage from '@/components/ui/FeedbackMessage'
import Icon from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import Modal from '@/components/ui/Modal'
import { useTheme } from '@/components/ui/ThemeProvider'
import { useToast } from '@/components/ui/ToastProvider'
import type { Profile, ThemePreference } from '@/types/profile'
import ChangePasswordForm from './ChangePasswordForm'
import ProfileAvatar from './ProfileAvatar'
import ProfileForm from './ProfileForm'

const themeOptions: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Claro', icon: 'sun' },
  { value: 'dark', label: 'Oscuro', icon: 'moon' },
  { value: 'system', label: 'Sistema', icon: 'monitor' },
]
const itemClass = 'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors enabled:hover:bg-surface-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'

export default function AccountMenu({ profile, email }: { profile: Profile; email: string }) {
  const router = useRouter()
  const { preference, setPreference } = useTheme()
  const { showToast } = useToast()
  const panelId = useId()
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const actionLock = useRef(false)
  const [open, setOpen] = useState(false)
  const [editor, setEditor] = useState<'profile' | 'password' | null>(null)
  const [editorBusy, setEditorBusy] = useState(false)
  const [pendingAction, setPendingAction] = useState<ThemePreference | 'logout' | null>(null)
  const [error, setError] = useState<string>()
  const [navigating, startTransition] = useTransition()
  const pending = Boolean(pendingAction) || navigating
  const displayName = profile.full_name?.trim() || email.split('@')[0] || 'Mi cuenta'

  useEffect(() => {
    if (!open) return
    function outsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outsideClick)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outsideClick)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  function closeEditor() {
    if (editorBusy) return
    setEditor(null)
    // The native dialog must release its inert background before focus returns.
    window.requestAnimationFrame(() => trigger.current?.focus())
  }

  function savedEditor() {
    setEditor(null)
    window.requestAnimationFrame(() => trigger.current?.focus())
    startTransition(() => router.refresh())
  }

  function openEditor(nextEditor: 'profile' | 'password') {
    setOpen(false)
    setError(undefined)
    setEditor(nextEditor)
  }

  async function selectTheme(nextPreference: ThemePreference) {
    // Re-selecting the current appearance can repair an invalid stored preference.
    if (actionLock.current || pending) return
    actionLock.current = true
    setPendingAction(nextPreference)
    setError(undefined)
    try {
      const result = await updateThemePreference(nextPreference)
      if (!result.success) {
        setError(result.error ?? 'No pudimos guardar la apariencia. Inténtalo de nuevo.')
        return
      }
      setPreference(nextPreference)
      showToast('Apariencia actualizada', nextPreference === 'system'
        ? 'La aplicación seguirá la apariencia de tu dispositivo.'
        : `Has seleccionado el tema ${nextPreference === 'light' ? 'claro' : 'oscuro'}.`)
      startTransition(() => router.refresh())
    } catch {
      setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      actionLock.current = false
      setPendingAction(null)
    }
  }

  async function signOut() {
    if (actionLock.current || pending) return
    actionLock.current = true
    setPendingAction('logout')
    setError(undefined)
    let leaving = false
    try {
      const result = await logout()
      if (!result.success) {
        setError(result.error ?? 'No pudimos cerrar la sesión. Inténtalo de nuevo.')
        return
      }
      leaving = true
      showToast('Sesión cerrada', 'Has salido de tu cuenta correctamente.')
      startTransition(() => {
        router.replace('/login')
        router.refresh()
      })
    } catch {
      setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      if (!leaving) {
        actionLock.current = false
        setPendingAction(null)
      }
    }
  }

  return (
    <>
      <div
        ref={container}
        className="relative"
        onBlur={(event) => {
          if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) {
            setOpen(false)
          }
        }}
      >
        <button
          ref={trigger}
          type="button"
          aria-label={`Opciones de cuenta de ${displayName}`}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((current) => !current)}
          disabled={pendingAction === 'logout'}
          className="flex min-h-11 items-center gap-3 rounded-xl p-1.5 text-sm font-medium transition-colors hover:bg-surface-highlight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        >
          <ProfileAvatar name={displayName} avatarUrl={profile.avatar_url} />
          <span className="hidden max-w-48 truncate sm:block">{displayName}</span>
          <Icon name="chevron-down" className={`size-4 text-muted transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div id={panelId} aria-busy={pending} className="absolute right-0 top-full z-30 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-2 shadow-(--toast-shadow)">
            <div className="border-b border-border px-3 pb-4 pt-3">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="mt-1 break-all text-xs leading-5 text-muted">{email}</p>
            </div>
            <nav aria-label="Configuración de cuenta" className="py-2">
              <button type="button" disabled={pending} onClick={() => openEditor('profile')} className={itemClass}>
                <Icon name="user" className="size-4 text-muted" />Editar perfil
              </button>
              <button type="button" disabled={pending} onClick={() => openEditor('password')} className={itemClass}>
                <Icon name="key" className="size-4 text-muted" />Cambiar contraseña
              </button>
            </nav>
            <fieldset disabled={pending} className="border-y border-border px-3 py-4">
              <legend className="sr-only">Apariencia</legend>
              <p className="mb-3 text-xs font-medium text-muted">Apariencia</p>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={preference === option.value}
                    onClick={() => selectTheme(option.value)}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait motion-reduce:transition-none ${preference === option.value ? 'border-accent bg-surface-highlight text-accent' : 'border-border text-muted enabled:hover:bg-surface-highlight enabled:hover:text-foreground'}`}
                  >
                    <Icon name={pendingAction === option.value ? 'loader' : option.icon} className={`size-4 ${pendingAction === option.value ? 'motion-safe:animate-spin' : ''}`} />
                    {option.label}
                    {pendingAction === option.value && <span className="sr-only">Guardando apariencia…</span>}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="pt-2">
              <button type="button" disabled={pending} onClick={signOut} className={`${itemClass} text-danger`}>
                <Icon name={pendingAction === 'logout' ? 'loader' : 'logout'} className={`size-4 ${pendingAction === 'logout' ? 'motion-safe:animate-spin' : ''}`} />
                {pendingAction === 'logout' ? 'Cerrando sesión…' : 'Cerrar sesión'}
              </button>
            </div>
            <div role="alert" aria-atomic="true">
              {error && <FeedbackMessage icon="alert-circle" tone="error" className="mt-2">{error}</FeedbackMessage>}
            </div>
          </div>
        )}
      </div>
      <Modal
        open={editor === 'profile'}
        onClose={closeEditor}
        title="Editar perfil"
        description="Personaliza tu nombre visible y tu imagen de perfil."
        busy={editorBusy}
      >
        {editor === 'profile' && <ProfileForm profile={profile} email={email} onCancel={closeEditor} onBusyChange={setEditorBusy} />}
      </Modal>
      <Modal
        open={editor === 'password'}
        onClose={closeEditor}
        title="Cambiar contraseña"
        description="Elige una contraseña única para proteger tu cuenta."
        busy={editorBusy}
      >
        {editor === 'password' && <ChangePasswordForm onSaved={savedEditor} onCancel={closeEditor} onBusyChange={setEditorBusy} />}
      </Modal>
    </>
  )
}
