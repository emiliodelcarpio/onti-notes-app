'use server'

import { isAuthError } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { AuthResult } from '@/types/auth'

const unavailable = 'No pudimos completar la solicitud. Inténtalo de nuevo más tarde.'
const neutral = { success: true }

function readEmail(formData: FormData) {
  const value = formData.get('email')
  if (typeof value !== 'string') return null
  const email = value.trim()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function readPassword(formData: FormData) {
  const password = formData.get('password')
  return typeof password === 'string' && password.length > 0 && password.length <= 128
    ? password : null
}

function validateNewPassword(formData: FormData) {
  const password = readPassword(formData)
  if (!password || password.length < 8) {
    return { error: 'Usa una contraseña de entre 8 y 128 caracteres.' }
  }
  if (password !== formData.get('confirmPassword')) {
    return { error: 'Las contraseñas no coinciden.' }
  }
  return { password }
}

function logRecoveryFailure(error: unknown) {
  // Keep provider details on the server; never log the email, message or tokens.
  console.error('[auth.forgotPassword]', {
    code: isAuthError(error) ? error.code ?? 'auth_error' : 'unexpected_error',
    status: isAuthError(error) ? error.status ?? null : null,
  })
}

async function getRecoveryRedirectUrl() {
  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin')
  const host = (requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'))
    ?.split(',')[0]?.trim()
  if (!origin || !host) throw new Error('Missing request origin.')

  const url = new URL(origin)
  if (url.origin !== origin || url.host !== host || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Invalid request origin.')
  }

  // Use this request's validated origin so the PKCE cookie remains available.
  return new URL('/auth/confirm?type=recovery', url).toString()
}

export async function login(formData: FormData): Promise<AuthResult> {
  const email = readEmail(formData)
  const password = readPassword(formData)
  if (!email || !password) return { success: false, error: 'Introduce un correo válido y una contraseña de hasta 128 caracteres.' }
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { success: false, error: 'No pudimos iniciar sesión. Revisa tus datos o solicita recuperar tu contraseña.' }
    revalidatePath('/', 'layout')
    return { success: true }
  } catch {
    return { success: false, error: unavailable }
  }
}

export async function register(formData: FormData): Promise<AuthResult> {
  const email = readEmail(formData)
  if (!email) return { success: false, error: 'Introduce un correo electrónico válido.' }
  const validated = validateNewPassword(formData)
  if (!validated.password) return { success: false, error: validated.error }
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({ email, password: validated.password })
    // These responses can depend on whether an address is already registered.
    // Keep the public result identical to a successful request.
    if (error && error.status && error.status >= 500) return { success: false, error: unavailable }
    revalidatePath('/', 'layout')
    return neutral
  } catch {
    return { success: false, error: unavailable }
  }
}

export async function forgotPassword(formData: FormData): Promise<AuthResult> {
  const email = readEmail(formData)
  if (!email) return { success: false, error: 'Introduce un correo electrónico válido.' }
  try {
    const supabase = await createClient()
    const redirectTo = await getRecoveryRedirectUrl()
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) {
      logRecoveryFailure(error)
      if (!error.status || error.status >= 500) return { success: false, error: unavailable }
      // Recipient restrictions and rate limits can reveal whether an account exists.
      // Keep the public response neutral and diagnose the rejection on the server.
    }
    return neutral
  } catch (error) {
    logRecoveryFailure(error)
    return { success: false, error: unavailable }
  }
}

export async function logout(): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) return { success: false, error: unavailable }
    revalidatePath('/', 'layout')
    return { success: true }
  } catch {
    return { success: false, error: unavailable }
  }
}

export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const validated = validateNewPassword(formData)
  if (!validated.password) return { success: false, error: validated.error }
  try {
    const supabase = await createClient()
    const { data, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !data.user) return { success: false, error: 'El enlace no es válido o ha caducado. Solicita uno nuevo.' }
    const { error } = await supabase.auth.updateUser({ password: validated.password })
    if (error) return { success: false, error: 'No pudimos cambiar la contraseña. Usa una contraseña distinta de entre 8 y 128 caracteres e inténtalo de nuevo.' }
    revalidatePath('/', 'layout')
    return { success: true }
  } catch {
    return { success: false, error: unavailable }
  }
}
