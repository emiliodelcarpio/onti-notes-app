'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AuthResult } from '@/types/auth'
import type { Note } from '@/types/notes'

const unavailable = 'No pudimos guardar los cambios. Inténtalo de nuevo.'
const expiredSession = 'Tu sesión ha caducado. Inicia sesión de nuevo.'
const noteTypes = ['note', 'reminder'] as const
const priorities = ['low', 'medium', 'high'] as const
const statuses = ['backlog', 'pending', 'in_progress', 'in_review', 'on_hold', 'completed', 'archived'] as const
const colors = ['indigo', 'teal', 'amber', 'rose', 'violet'] as const
const editableFields = new Set(['title', 'content', 'type', 'priority', 'status', 'color', 'remind_at'])
// MVP input limits; database ownership, IDs and timestamps are never taken from the form.
const maxTitleLength = 200
const maxContentLength = 20_000

type NoteInput = Pick<Note, 'title' | 'content' | 'type' | 'priority' | 'status' | 'color' | 'remind_at'>
type NoteInputResult = { value: NoteInput; error?: never } | { value?: never; error: string }

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function isOption<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.some((option) => option === value)
}

function readNoteInput(formData: FormData): NoteInputResult {
  if (!(formData instanceof FormData)) return { error: 'Revisa los datos del formulario.' }
  for (const key of formData.keys()) {
    if (!editableFields.has(key) || formData.getAll(key).length !== 1) {
      return { error: 'Revisa los datos del formulario.' }
    }
  }

  const titleValue = formData.get('title')
  const contentValue = formData.get('content') ?? ''
  if (typeof titleValue !== 'string' || !titleValue.trim() || titleValue.trim().length > maxTitleLength) {
    return { error: 'Escribe un título de entre 1 y 200 caracteres.' }
  }
  if (typeof contentValue !== 'string' || contentValue.length > maxContentLength) {
    return { error: 'El contenido admite hasta 20.000 caracteres.' }
  }

  const type = formData.get('type')
  const priority = formData.get('priority')
  const status = formData.get('status')
  const color = formData.get('color')
  if (!isOption(type, noteTypes) || !isOption(priority, priorities) || !isOption(status, statuses) || !isOption(color, colors)) {
    return { error: 'Selecciona un tipo, prioridad, estatus y color válidos.' }
  }

  const remindAtValue = formData.get('remind_at') ?? ''
  if (typeof remindAtValue !== 'string') return { error: 'Selecciona una fecha válida para el recordatorio.' }
  let remindAt: string | null = null
  if (type === 'reminder') {
    // The client converts the user's local date to an ISO UTC instant before sending it.
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(remindAtValue)) {
      return { error: 'Selecciona la fecha y hora del recordatorio.' }
    }
    const date = new Date(remindAtValue)
    if (!Number.isFinite(date.getTime())) return { error: 'Selecciona una fecha válida para el recordatorio.' }
    remindAt = date.toISOString()
    // Reject calendar dates that JavaScript would otherwise normalize, such as February 30.
    if (remindAtValue !== remindAt && remindAtValue !== remindAt.replace('.000Z', 'Z')) {
      return { error: 'Selecciona una fecha válida para el recordatorio.' }
    }
  } else if (remindAtValue !== '') {
    return { error: 'Las notas no deben tener una fecha de recordatorio.' }
  }

  return {
    value: {
      title: titleValue.trim(),
      content: contentValue.trim() || null,
      type,
      priority,
      status,
      color,
      remind_at: remindAt,
    },
  }
}

export async function createNote(formData: FormData): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    const { data: session, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !session.user) return { success: false, error: expiredSession }

    const input = readNoteInput(formData)
    if (!input.value) return { success: false, error: input.error }
    if (input.value.remind_at && Date.parse(input.value.remind_at) <= Date.now()) {
      return { success: false, error: 'La fecha del recordatorio debe ser futura.' }
    }

    // user_id uses auth.uid() in PostgreSQL; INSERT permission excludes ownership fields.
    const { data, error } = await supabase.from('notes').insert(input.value).select('id').single()
    if (error || !data) return { success: false, error: unavailable }
    revalidatePath('/')
    return { success: true }
  } catch {
    return { success: false, error: unavailable }
  }
}

export async function updateNote(id: string, formData: FormData): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    const { data: session, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !session.user) return { success: false, error: expiredSession }
    if (!isUuid(id)) return { success: false, error: unavailable }

    const input = readNoteInput(formData)
    if (!input.value) return { success: false, error: input.error }
    const { data: existing, error: readError } = await supabase.from('notes')
      .select('type, remind_at').eq('id', id).eq('user_id', session.user.id).maybeSingle()
    if (readError || !existing) return { success: false, error: unavailable }

    const scheduleChanged = existing.type !== input.value.type ||
      (existing.remind_at ? Date.parse(existing.remind_at) : null) !==
      (input.value.remind_at ? Date.parse(input.value.remind_at) : null)
    if (input.value.remind_at && scheduleChanged && Date.parse(input.value.remind_at) <= Date.now()) {
      return { success: false, error: 'La fecha del recordatorio debe ser futura al programarlo o cambiar su fecha.' }
    }

    const { data, error } = await supabase.from('notes').update(input.value)
      .eq('id', id).eq('user_id', session.user.id).select('id').maybeSingle()
    if (error || !data) return { success: false, error: unavailable }
    revalidatePath('/')
    return { success: true }
  } catch {
    return { success: false, error: unavailable }
  }
}

export async function deleteNote(id: string): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    const { data: session, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !session.user) return { success: false, error: expiredSession }
    if (!isUuid(id)) return { success: false, error: 'No pudimos eliminar el elemento. Inténtalo de nuevo.' }

    const { data, error } = await supabase.from('notes').delete()
      .eq('id', id).eq('user_id', session.user.id).select('id').maybeSingle()
    if (error || !data) return { success: false, error: 'No pudimos eliminar el elemento. Inténtalo de nuevo.' }
    revalidatePath('/')
    return { success: true }
  } catch {
    return { success: false, error: 'No pudimos eliminar el elemento. Inténtalo de nuevo.' }
  }
}

export async function updateNoteStatus(id: string, status: unknown): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    const { data: session, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !session.user) return { success: false, error: expiredSession }
    if (!isUuid(id) || !isOption(status, statuses)) return { success: false, error: 'Selecciona un estatus válido.' }

    const { data, error } = await supabase.from('notes').update({ status })
      .eq('id', id).eq('user_id', session.user.id).select('id').maybeSingle()
    if (error || !data) return { success: false, error: unavailable }
    revalidatePath('/')
    return { success: true }
  } catch {
    return { success: false, error: unavailable }
  }
}
