'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isThemePreference } from '@/lib/theme'
import { logProfileFailure } from '@/lib/profile-diagnostics'
import type { AuthResult } from '@/types/auth'
import type { Profile, ThemePreference } from '@/types/profile'

const unavailable = 'No pudimos guardar tu perfil. Inténtalo de nuevo.'
const expiredSession = 'Tu sesión ha caducado. Inicia sesión de nuevo.'
const editableFields = new Set(['full_name'])
type ProfileInput = Pick<Profile, 'full_name'>
type ProfileInputResult = { value: ProfileInput; error?: never } | { value?: never; error: string }

function readProfileInput(formData: FormData): ProfileInputResult {
  if (!(formData instanceof FormData)) return { error: 'Revisa los datos de tu perfil.' }
  for (const key of formData.keys()) {
    if (!editableFields.has(key) || formData.getAll(key).length !== 1) {
      return { error: 'Revisa los datos de tu perfil.' }
    }
  }

  const fullNameValue = formData.get('full_name') ?? ''
  if (typeof fullNameValue !== 'string' || fullNameValue.trim().length > 80) {
    return { error: 'El nombre admite hasta 80 caracteres.' }
  }
  const value: ProfileInput = {
    full_name: fullNameValue.trim() || null,
  }
  return { value }
}

async function rememberTheme(preference: ThemePreference) {
  const cookieStore = await cookies()
  cookieStore.set('onti-theme', preference, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}

export async function updateProfile(formData: FormData): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    const { data: session, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !session.user) return { success: false, error: expiredSession }

    const input = readProfileInput(formData)
    if (!input.value) return { success: false, error: input.error }
    // Profiles are created by the auth.users trigger. Never create one from this action.
    const { data, error, status } = await supabase.from('profiles').update(input.value)
      .eq('id', session.user.id).select('id').maybeSingle()
    if (error || !data) {
      logProfileFailure('update', error ? 'request_failed' : 'missing_profile', error?.code, status)
      return { success: false, error: unavailable }
    }
    revalidatePath('/', 'layout')
    return { success: true }
  } catch {
    logProfileFailure('update', 'unexpected_error')
    return { success: false, error: unavailable }
  }
}

export async function updateThemePreference(preference: unknown): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    const { data: session, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !session.user) return { success: false, error: expiredSession }
    if (!isThemePreference(preference)) return { success: false, error: 'Selecciona un tema válido.' }

    const { data, error, status } = await supabase.from('profiles').update({ theme_preference: preference })
      .eq('id', session.user.id).select('id').maybeSingle()
    if (error || !data) {
      logProfileFailure('theme', error ? 'request_failed' : 'missing_profile', error?.code, status)
      return { success: false, error: 'No pudimos guardar el tema. Inténtalo de nuevo.' }
    }
    await rememberTheme(preference)
    revalidatePath('/', 'layout')
    return { success: true }
  } catch {
    logProfileFailure('theme', 'unexpected_error')
    return { success: false, error: 'No pudimos guardar el tema. Inténtalo de nuevo.' }
  }
}
