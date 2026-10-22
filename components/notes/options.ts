import type { Note } from '@/types/notes'

export const noteTypes: { value: Note['type']; label: string }[] = [
  { value: 'note', label: 'Nota' },
  { value: 'reminder', label: 'Recordatorio' },
]

export const notePriorities: { value: Note['priority']; label: string }[] = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
]

export const noteStatuses: { value: Note['status']; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En proceso' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'on_hold', label: 'En espera' },
  { value: 'completed', label: 'Completado' },
  { value: 'archived', label: 'Archivado' },
]

export const noteColors: {
  value: Note['color']
  label: string
  className: string
}[] = [
  { value: 'indigo', label: 'Índigo', className: 'border-note-indigo-border bg-note-indigo text-note-indigo-fg' },
  { value: 'teal', label: 'Verde agua', className: 'border-note-teal-border bg-note-teal text-note-teal-fg' },
  { value: 'amber', label: 'Ámbar', className: 'border-note-amber-border bg-note-amber text-note-amber-fg' },
  { value: 'rose', label: 'Rosa', className: 'border-note-rose-border bg-note-rose text-note-rose-fg' },
  { value: 'violet', label: 'Violeta', className: 'border-note-violet-border bg-note-violet text-note-violet-fg' },
]

export const fieldClassName = 'w-full rounded-lg border border-input-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60'
export const focusClassName = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent'
