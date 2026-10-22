'use client'

import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createNote, updateNote } from '@/actions/notes'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/ToastProvider'
import { fromLocalDateTime, toLocalDateTime } from '@/lib/datetime'
import type { Note } from '@/types/notes'
import { fieldClassName, focusClassName, noteColors, notePriorities, noteStatuses, noteTypes } from './options'

type NoteEditorProps = {
  note?: Note
  initialType: Note['type']
  timezone: string
  onClose: () => void
  onSaved: () => void
}

type FieldErrors = { title?: string; remind_at?: string }

export default function NoteEditor({ note, initialType, timezone, onClose, onSaved }: NoteEditorProps) {
  const [type, setType] = useState(note?.type ?? initialType)
  const [color, setColor] = useState(note?.color ?? 'indigo')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const submitting = useRef(false)
  const { showToast } = useToast()
  const initialDate = note?.remind_at ? toLocalDateTime(note.remind_at, timezone) : ''

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return

    const data = new FormData(event.currentTarget)
    const titleValue = data.get('title')
    const title = typeof titleValue === 'string' ? titleValue.trim() : ''
    const nextErrors: FieldErrors = {}
    if (!title || title.length > 200) nextErrors.title = 'Escribe un título de entre 1 y 200 caracteres.'

    if (type === 'reminder') {
      const dateValue = data.get('remind_at')
      const localDate = typeof dateValue === 'string' ? dateValue : ''
      const unchangedDate = note?.type === 'reminder' && localDate === initialDate
      const isoDate = unchangedDate && note.remind_at
        ? new Date(note.remind_at).toISOString()
        : fromLocalDateTime(localDate, timezone)
      if (!isoDate) {
        nextErrors.remind_at = 'Elige una fecha y hora válida para tu zona horaria.'
      } else if (!unchangedDate && new Date(isoDate).getTime() <= Date.now()) {
        nextErrors.remind_at = 'La fecha y hora del recordatorio debe ser futura.'
      } else {
        data.set('remind_at', isoDate)
      }
    } else {
      data.set('remind_at', '')
    }

    setFieldErrors(nextErrors)
    setError('')
    if (Object.keys(nextErrors).length) {
      event.currentTarget.querySelector<HTMLInputElement>(`[name="${nextErrors.title ? 'title' : 'remind_at'}"]`)?.focus()
      return
    }

    data.set('title', title)
    data.set('type', type)
    data.set('color', color)
    submitting.current = true
    setPending(true)
    try {
      const result = note ? await updateNote(note.id, data) : await createNote(data)
      if (!result.success) {
        setError(result.error ?? 'No pudimos guardar los cambios. Inténtalo de nuevo.')
        return
      }
      showToast(note ? 'Cambios guardados' : type === 'reminder' ? 'Recordatorio creado' : 'Nota creada',
        type === 'reminder' ? 'La fecha quedó guardada. El envío de notificaciones aún no está habilitado.' : 'Tu idea ya está guardada en tu espacio.')
      onSaved()
    } catch {
      setError('No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <Modal open onClose={onClose} busy={pending} title={note ? 'Editar contenido' : type === 'reminder' ? 'Nuevo recordatorio' : 'Nueva nota'} description="Un lugar para tus ideas y lo que necesitas recordar.">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="note-type" className="mb-2 block text-sm font-medium">Tipo</label>
          <select id="note-type" name="type" value={type} disabled={pending} className={fieldClassName} onChange={(event) => {
            const selected = noteTypes.find((option) => option.value === event.target.value)
            if (selected) { setType(selected.value); setFieldErrors({}) }
          }}>
            {noteTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="note-title" className="mb-2 block text-sm font-medium">Título <span className="text-muted">(obligatorio)</span></label>
          <input id="note-title" name="title" defaultValue={note?.title ?? ''} placeholder="Dale un título a tu idea" maxLength={200} required disabled={pending} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? 'note-title-error' : undefined} className={`${fieldClassName} ${fieldErrors.title ? 'border-danger' : ''}`} />
          {fieldErrors.title && <p id="note-title-error" className="mt-2 text-sm text-danger">{fieldErrors.title}</p>}
        </div>
        <div>
          <label htmlFor="note-content" className="mb-2 block text-sm font-medium">Contenido <span className="text-muted">(opcional)</span></label>
          <textarea id="note-content" name="content" defaultValue={note?.content ?? ''} placeholder="Escribe lo que tienes en mente…" maxLength={20000} rows={5} disabled={pending} className={`${fieldClassName} min-h-28 resize-y`} />
        </div>
        {type === 'reminder' && (
          <div className="rounded-xl border border-border bg-background p-4">
            <label htmlFor="note-remind-at" className="mb-2 flex items-center gap-2 text-sm font-medium"><Icon name="calendar" />Fecha y hora</label>
            <input id="note-remind-at" name="remind_at" type="datetime-local" defaultValue={initialDate} required disabled={pending} aria-invalid={Boolean(fieldErrors.remind_at)} aria-describedby={`note-date-help${fieldErrors.remind_at ? ' note-date-error' : ''}`} className={`${fieldClassName} ${fieldErrors.remind_at ? 'border-danger' : ''}`} />
            <p id="note-date-help" className="mt-2 text-xs leading-5 text-muted">Zona horaria de tu dispositivo: {timezone}. Se guardará el recordatorio; el envío de correos aún no está habilitado.</p>
            {fieldErrors.remind_at && <p id="note-date-error" className="mt-2 text-sm text-danger">{fieldErrors.remind_at}</p>}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="note-priority" className="mb-2 block text-sm font-medium">Prioridad</label>
            <select id="note-priority" name="priority" defaultValue={note?.priority ?? 'medium'} disabled={pending} className={fieldClassName}>
              {notePriorities.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="note-status" className="mb-2 block text-sm font-medium">Estatus</label>
            <select id="note-status" name="status" defaultValue={note?.status ?? 'backlog'} disabled={pending} className={fieldClassName}>
              {noteStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>
        <fieldset disabled={pending}>
          <legend className="mb-2 text-sm font-medium">Color</legend>
          <div className="flex flex-wrap gap-2">
            {noteColors.map((option) => (
              <label key={option.value} className={`relative flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-medium ${option.className} ${pending ? 'cursor-not-allowed opacity-60' : ''}`}>
                <input name="color" type="radio" value={option.value} checked={color === option.value} onChange={() => setColor(option.value)} className={`size-4 accent-accent ${focusClassName}`} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger-border bg-danger-surface p-3 text-sm leading-6 text-danger"><Icon name="alert-circle" className="mt-0.5" />{error}</p>}
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>Cancelar</Button>
          <Button type="submit" pending={pending}>{pending ? 'Guardando…' : <><Icon name="check" />{note ? 'Guardar cambios' : type === 'reminder' ? 'Crear recordatorio' : 'Crear nota'}</>}</Button>
        </div>
      </form>
    </Modal>
  )
}
