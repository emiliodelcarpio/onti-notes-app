'use server'

import { getKanbanPage, getNotesPage, isNotesCursor, isNotesFilters, isNotesView } from '@/lib/notes'
import { createClient } from '@/lib/supabase/server'
import type { LoadKanbanResult, LoadNotesResult, NotesCursor, NotesFilters, NotesView } from '@/types/notes'

export async function loadNotes(
  filters: NotesFilters,
  cursor: NotesCursor | null = null,
  view: NotesView = 'cards',
): Promise<LoadNotesResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return { success: false, error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }
    if (!isNotesFilters(filters) || !isNotesCursor(cursor) || !isNotesView(view) ||
      (view === 'kanban' && filters.status === 'all')) {
      return { success: false, error: 'Revisa los filtros e inténtalo de nuevo.' }
    }
    const page = await getNotesPage(supabase, data.user.id, filters, cursor, view)
    return { success: true, page }
  } catch {
    return { success: false, error: 'No pudimos cargar tus notas. Revisa tu conexión e inténtalo de nuevo.' }
  }
}

export async function loadKanbanNotes(filters: NotesFilters): Promise<LoadKanbanResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return { success: false, error: 'Tu sesión ha caducado. Inicia sesión de nuevo.' }
    if (!isNotesFilters(filters)) return { success: false, error: 'Revisa los filtros e inténtalo de nuevo.' }
    const page = await getKanbanPage(supabase, data.user.id, filters)
    return { success: true, page }
  } catch {
    return { success: false, error: 'No pudimos cargar tus notas. Revisa tu conexión e inténtalo de nuevo.' }
  }
}
