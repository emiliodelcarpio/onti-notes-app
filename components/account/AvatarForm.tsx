'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { removeAvatar, uploadAvatar } from '@/actions/avatar'
import { avatarAcceptedTypes, avatarFileAccept, avatarMaxBytes } from '@/lib/avatar'
import Button from '@/components/ui/Button'
import FeedbackMessage from '@/components/ui/FeedbackMessage'
import Icon from '@/components/ui/Icon'
import { useToast } from '@/components/ui/ToastProvider'
import ProfileAvatar from './ProfileAvatar'

type Selection = { file: File; url: string; ready: boolean }

export default function AvatarForm({ avatarUrl, name, disabled, onRequestStart, onRequestEnd }: {
  avatarUrl: string | null
  name: string
  disabled: boolean
  onRequestStart: () => boolean
  onRequestEnd: () => void
}) {
  const [savedAvatar, setSavedAvatar] = useState(avatarUrl)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [pending, setPending] = useState<'upload' | 'remove' | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [warning, setWarning] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const lock = useRef(false)
  const { showToast } = useToast()
  const previewUrl = selection?.url

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  function discardSelection() {
    setSelection(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    if (disabled || lock.current) return
    const file = event.target.files?.[0]
    setError('')
    setMessage('')
    setWarning('')
    setConfirmRemove(false)
    setSelection(null)
    if (!file) return
    if (file.size === 0 || file.size > avatarMaxBytes) {
      event.target.value = ''
      setError(file.size === 0 ? 'Selecciona una imagen con contenido.' : 'La imagen debe pesar como máximo 2 MB.')
      return
    }
    if (!avatarAcceptedTypes.some((type) => type === file.type)) {
      event.target.value = ''
      setError('Usa una imagen JPG, PNG o WebP.')
      return
    }
    setSelection({ file, url: URL.createObjectURL(file), ready: false })
  }

  async function savePhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || lock.current || !selection?.ready || !onRequestStart()) return
    lock.current = true
    setPending('upload')
    setError('')
    setMessage('')
    setWarning('')
    try {
      const data = new FormData()
      data.set('avatar', selection.file)
      const result = await uploadAvatar(data)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSavedAvatar(result.avatarUrl)
      discardSelection()
      setWarning(result.warning ?? '')
      setMessage('Tu foto de perfil se ha actualizado.')
      showToast('Foto actualizada', 'Tu nueva imagen ya está guardada.')
      requestAnimationFrame(() => fileInput.current?.focus())
    } catch {
      setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      lock.current = false
      setPending(null)
      onRequestEnd()
    }
  }

  async function deletePhoto() {
    if (disabled || lock.current || !confirmRemove || !onRequestStart()) return
    lock.current = true
    setPending('remove')
    setError('')
    setMessage('')
    setWarning('')
    try {
      const result = await removeAvatar()
      if (!result.success) {
        setError(result.error)
        return
      }
      setSavedAvatar(null)
      setConfirmRemove(false)
      setWarning(result.warning ?? '')
      setMessage('Se ha quitado tu foto. Ahora se muestran tus iniciales.')
      showToast('Foto eliminada', 'Tu perfil vuelve a mostrar tus iniciales.')
      requestAnimationFrame(() => fileInput.current?.focus())
    } catch {
      setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      lock.current = false
      setPending(null)
      onRequestEnd()
    }
  }

  return <section aria-labelledby="profile-avatar-title" className="rounded-xl border border-border bg-surface-highlight/40 p-4 sm:p-5">
    <h3 id="profile-avatar-title" className="text-sm font-semibold">Foto de perfil</h3>
    <p className="mt-1 text-xs leading-5 text-muted">Tu foto se guarda por separado de los demás datos del perfil.</p>
    <form onSubmit={savePhoto} noValidate aria-busy={pending !== null} className="mt-4 space-y-4">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {selection ? <div className="size-24 shrink-0 overflow-hidden rounded-full border border-border bg-surface-highlight">
          <Image key={selection.url} src={selection.url} width={96} height={96} unoptimized alt="Vista previa de la foto seleccionada" className="size-full object-cover"
            onLoad={() => setSelection((current) => current?.url === selection.url ? { ...current, ready: true } : current)}
            onError={() => { discardSelection(); setError('No pudimos leer esta imagen. Selecciona otra foto JPG, PNG o WebP.') }} />
        </div> : <div role="img" aria-label={savedAvatar ? 'Foto de perfil actual' : 'Iniciales de tu perfil'}><ProfileAvatar name={name} avatarUrl={savedAvatar} size="large" /></div>}
        <div className="min-w-0 flex-1">
          <label htmlFor="profile-avatar-file" className="text-sm font-medium">Seleccionar imagen</label>
          <input ref={fileInput} id="profile-avatar-file" name="avatar" type="file" accept={avatarFileAccept} disabled={disabled}
            onChange={selectFile} aria-describedby={`profile-avatar-help${error ? ' profile-avatar-error' : ''}`} aria-invalid={Boolean(error)}
            className="mt-2 block min-h-11 w-full min-w-0 rounded-lg border border-input-border bg-input p-2 text-xs text-foreground file:mr-3 file:min-h-8 file:rounded-md file:border-0 file:bg-surface-highlight file:px-3 file:font-medium file:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60" />
          <p id="profile-avatar-help" className="mt-2 text-xs leading-5 text-muted">JPG, PNG o WebP. Máximo 2 MB.</p>
          {selection && <p className="mt-1 break-all text-xs text-muted">{selection.file.name}</p>}
          {selection && !selection.ready && <p role="status" className="mt-1 text-xs text-muted">Preparando vista previa…</p>}
        </div>
      </div>
      {error && <div id="profile-avatar-error" role="alert"><FeedbackMessage tone="error" icon="alert-circle">{error}</FeedbackMessage></div>}
      {message && <p role="status" className="flex items-start gap-2 text-xs leading-5 text-success"><Icon name="check-circle" className="size-4 shrink-0" />{message}</p>}
      {warning && <p role="status" className="text-xs leading-5 text-muted">{warning}</p>}
      {selection ? <div className="flex flex-wrap gap-2">
        <Button type="submit" pending={pending === 'upload'} disabled={disabled || !selection.ready}><Icon name="check" className="size-4" />{pending === 'upload' ? 'Guardando foto…' : 'Guardar foto'}</Button>
        <Button variant="secondary" disabled={disabled} onClick={discardSelection}>Descartar selección</Button>
      </div> : savedAvatar && !confirmRemove && <Button variant="ghost" disabled={disabled} onClick={() => { setConfirmRemove(true); setError(''); setMessage(''); setWarning('') }}><Icon name="trash" className="size-4" />Quitar foto</Button>}
      {confirmRemove && <div className="rounded-lg border border-border bg-surface p-3">
        <p className="text-sm leading-6">¿Quitar tu foto de perfil? Se mostrarán tus iniciales.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" disabled={disabled} onClick={() => setConfirmRemove(false)}>Conservar foto</Button>
          <Button variant="danger" pending={pending === 'remove'} disabled={disabled} onClick={deletePhoto}>{pending === 'remove' ? 'Quitando foto…' : 'Confirmar eliminación'}</Button>
        </div>
      </div>}
    </form>
  </section>
}
