import type { Database } from '@/types/database'

export type Note = Database['public']['Tables']['notes']['Row']
export type NoteType = Note['type']
export type NotePriority = Note['priority']
export type NoteStatus = Note['status']
export type NoteColor = Note['color']
