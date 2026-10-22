import type { Database } from '@/types/database'

export type Note = Database['public']['Tables']['notes']['Row']
export type NoteType = Note['type']
export type NotePriority = Note['priority']
export type NoteStatus = Note['status']
export type NoteColor = Note['color']
export type NotesView = 'cards' | 'kanban'

export type NotesFilters = {
  type: NoteType | 'all'
  status: NoteStatus | 'all'
  priority: NotePriority | 'all'
  query: string
}

export type NotesCursor = {
  createdAt: string
  id: string
}

export type NotesPage = {
  notes: Note[]
  nextCursor: NotesCursor | null
}

export type KanbanPage = {
  columns: { status: NoteStatus; page: NotesPage }[]
}

export type KanbanColumnState = {
  status: NoteStatus
  notes: Note[]
  hasMore: boolean
  loading: boolean
  error?: string
}

export type LoadNotesResult =
  | { success: true; page: NotesPage }
  | { success: false; error: string }

export type LoadKanbanResult =
  | { success: true; page: KanbanPage }
  | { success: false; error: string }
