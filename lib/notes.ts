import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { KanbanPage, NotesCursor, NotesFilters, NotesPage, NotesView } from '@/types/notes'

const pageSizes = { cards: 10, kanban: 3 }
const noteTypes = ['all', 'note', 'reminder'] as const
const priorities = ['all', 'low', 'medium', 'high'] as const
const noteStatuses = ['backlog', 'pending', 'in_progress', 'in_review', 'on_hold', 'completed', 'archived'] as const
const statuses = ['all', ...noteStatuses] as const
const accentedLetters: Record<string, string> = {
  a: '[aáàâäãå]', e: '[eéèêë]', i: '[iíìîï]', o: '[oóòôöõ]',
  u: '[uúùûü]', n: '[nñ]', c: '[cç]',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOption<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.some((option) => option === value)
}

export function isNotesFilters(value: unknown): value is NotesFilters {
  return isRecord(value) &&
    Object.keys(value).every((key) => ['type', 'status', 'priority', 'query'].includes(key)) &&
    isOption(value.type, noteTypes) && isOption(value.status, statuses) && isOption(value.priority, priorities) &&
    typeof value.query === 'string' && value.query.length <= 200 && !/[\u0000-\u001f\u007f]/.test(value.query)
}

export function isNotesView(value: unknown): value is NotesView {
  return value === 'cards' || value === 'kanban'
}

export function isNotesCursor(value: unknown): value is NotesCursor | null {
  if (value === null) return true
  if (!isRecord(value) || Object.keys(value).some((key) => key !== 'createdAt' && key !== 'id')) return false
  if (typeof value.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)) return false
  if (typeof value.createdAt !== 'string' ||
    !/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(value.createdAt)) return false
  const calendarDate = value.createdAt.slice(0, 10)
  const calendarInstant = new Date(`${calendarDate}T00:00:00Z`)
  // Validate calendar dates without rounding PostgreSQL's microsecond precision.
  return Number.isFinite(Date.parse(value.createdAt)) && Number.isFinite(calendarInstant.getTime()) &&
    calendarInstant.toISOString().slice(0, 10) === calendarDate
}

function quoteFilterValue(value: string): string {
  // PostgREST quoted values protect punctuation from being parsed as filter syntax.
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function searchPattern(value: string): string {
  // Keep substring search forgiving for Spanish accents while treating all user
  // punctuation literally; users cannot supply regexes or wildcard operators.
  const normalized = value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
  return Array.from(normalized, (character) => accentedLetters[character] ??
    character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')
}

export async function getNotesPage(
  supabase: SupabaseClient<Database>,
  userId: string,
  filters: NotesFilters,
  cursor: NotesCursor | null = null,
  view: NotesView = 'cards',
): Promise<NotesPage> {
  if (view === 'kanban' && filters.status === 'all') throw new Error('notes_status_required')
  const pageSize = pageSizes[view]
  let query = supabase.from('notes')
    .select('id, user_id, title, content, type, priority, status, color, remind_at, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    // One lookahead row determines whether another page exists without COUNT(*).
    .limit(pageSize + 1)

  if (filters.type !== 'all') query = query.eq('type', filters.type)
  if (filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.priority !== 'all') query = query.eq('priority', filters.priority)

  const conditions: string[] = []
  const pattern = searchPattern(filters.query)
  if (pattern) {
    const quotedPattern = quoteFilterValue(pattern)
    conditions.push(`or(title.imatch.${quotedPattern},content.imatch.${quotedPattern})`)
  }
  if (cursor) {
    const createdAt = quoteFilterValue(cursor.createdAt)
    conditions.push(`or(created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${cursor.id}))`)
  }
  if (conditions.length) query = query.or(`and(${conditions.join(',')})`)

  const { data, error } = await query
  if (error || !data) throw new Error('notes_unavailable')
  const notes = data.slice(0, pageSize)
  const lastNote = notes.at(-1)
  return {
    notes,
    nextCursor: data.length > pageSize && lastNote ? { createdAt: lastNote.created_at, id: lastNote.id } : null,
  }
}

export async function getKanbanPage(
  supabase: SupabaseClient<Database>,
  userId: string,
  filters: NotesFilters,
): Promise<KanbanPage> {
  const columns = await Promise.all(noteStatuses.map(async (status) => ({
    status,
    page: filters.status === 'all' || filters.status === status
      ? await getNotesPage(supabase, userId, { ...filters, status }, null, 'kanban')
      : { notes: [], nextCursor: null },
  })))
  return { columns }
}
