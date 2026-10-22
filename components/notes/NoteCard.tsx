'use client'

import type { ReactNode } from 'react'
import Icon from '@/components/ui/Icon'
import type { Note } from '@/types/notes'
import { fieldClassName, focusClassName, noteColors, notePriorities, noteStatuses } from './options'

type NoteCardProps = {
  note: Note
  timezone: string
  onEdit: (note: Note) => void
  onDelete: (note: Note) => void
  onStatusChange: (note: Note, status: Note['status']) => Promise<boolean>
  pending?: boolean
  statusDisabled?: boolean
  dragHandle?: ReactNode
}

export default function NoteCard({ note, timezone, onEdit, onDelete, onStatusChange, pending = false, statusDisabled = false, dragHandle }: NoteCardProps) {
  const color = noteColors.find((option) => option.value === note.color) ?? noteColors[0]
  const priority = notePriorities.find((option) => option.value === note.priority)
  const formatter = new Intl.DateTimeFormat('es-MX', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' })

  function changeStatus(value: string) {
    const status = noteStatuses.find((option) => option.value === value)
    if (!status || status.value === note.status || pending || statusDisabled) return
    void onStatusChange(note, status.value)
  }

  return (
    <article className={`flex h-full min-w-0 flex-col rounded-2xl border p-5 ${color.className}`} aria-busy={pending}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium">{dragHandle}<Icon name={note.type === 'reminder' ? 'calendar' : 'file'} className="size-4" />{note.type === 'reminder' ? 'Recordatorio' : 'Nota'}</span>
        <span className="flex items-center gap-1 rounded-full border border-current/20 px-2 py-1 text-xs font-medium"><Icon name="flag" className="size-3" />{priority?.label}</span>
      </div>
      <h3 className="wrap-anywhere text-base font-semibold leading-6 text-foreground">{note.title}</h3>
      {note.content && <p className="mt-2 line-clamp-5 whitespace-pre-wrap wrap-anywhere text-sm leading-6 text-foreground/80">{note.content}</p>}
      {note.remind_at && <p className="mt-4 flex items-start gap-2 text-xs leading-5"><Icon name="calendar" className="mt-0.5 size-4" /><time dateTime={note.remind_at}>{formatter.format(new Date(note.remind_at))}</time></p>}
      <div className="mt-auto pt-5">
        <label htmlFor={`status-${note.id}`} className="mb-1.5 block text-xs font-medium">{pending ? 'Actualizando estatus…' : 'Estatus'}</label>
        <select id={`status-${note.id}`} value={note.status} disabled={pending || statusDisabled} onChange={(event) => changeStatus(event.target.value)} className={`${fieldClassName} min-h-11 py-2 text-xs`}>
          {noteStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-current/15 pt-3">
          <span className="text-xs text-muted">Editado {new Intl.DateTimeFormat('es-MX', { timeZone: timezone, day: 'numeric', month: 'short' }).format(new Date(note.updated_at))}</span>
          <div className="flex gap-1">
            <button type="button" disabled={pending} onClick={() => onEdit(note)} aria-label={`Editar ${note.title}`} className={`flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-surface disabled:opacity-50 ${focusClassName}`}><Icon name="edit" className="size-4" /></button>
            <button type="button" disabled={pending} onClick={() => onDelete(note)} aria-label={`Eliminar ${note.title}`} className={`flex size-11 items-center justify-center rounded-lg text-danger transition-colors hover:bg-danger-surface disabled:opacity-50 ${focusClassName}`}><Icon name="trash" className="size-4" /></button>
          </div>
        </div>
      </div>
    </article>
  )
}
