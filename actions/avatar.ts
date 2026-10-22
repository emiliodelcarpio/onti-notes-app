'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { avatarAcceptedTypes, avatarBucketName, avatarMaxBytes } from '@/lib/avatar'
import { deleteOwnedAvatar, logAvatarFailure, signAvatarPath } from '@/lib/avatar-storage'
import type { AvatarResult } from '@/types/profile'

const unavailable = 'No pudimos guardar tu foto. Inténtalo de nuevo.'
const expiredSession = 'Tu sesión ha caducado. Inicia sesión de nuevo.'
const changedPhoto = 'Tu foto cambió en otra ventana. Actualiza la página e inténtalo de nuevo.'
const cleanupWarning = 'Tu foto se guardó, pero no pudimos eliminar el archivo anterior del almacenamiento.'

type AvatarFile = { file: File; extension: 'jpg' | 'png' | 'webp' }
type AvatarFileResult = { value: AvatarFile; error?: never } | { value?: never; error: string }

async function readAvatarFile(formData: FormData): Promise<AvatarFileResult> {
  if (!(formData instanceof FormData) || formData.getAll('avatar').length !== 1) {
    return { error: 'Selecciona una imagen para tu foto.' }
  }
  for (const key of formData.keys()) {
    if (key !== 'avatar') return { error: 'Revisa el archivo seleccionado.' }
  }
  const file = formData.get('avatar')
  if (!(file instanceof File) || file.size === 0) return { error: 'Selecciona una imagen para tu foto.' }
  if (file.size > avatarMaxBytes) return { error: 'La imagen debe pesar como máximo 2 MB.' }
  if (!avatarAcceptedTypes.some((type) => file.type === type)) {
    return { error: 'Usa una imagen JPG, PNG o WebP.' }
  }

  // Check the file bytes as well as its declared MIME type. Original names and
  // extensions are never used for Storage object keys or content types.
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (file.type === 'image/jpeg' && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return { value: { file, extension: 'jpg' } }
  }
  if (file.type === 'image/png' && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => header[index] === byte)) {
    return { value: { file, extension: 'png' } }
  }
  if (file.type === 'image/webp' && header.length === 16 &&
      header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
      header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50 &&
      header[12] === 0x56 && header[13] === 0x50 && header[14] === 0x38 &&
      (header[15] === 0x20 || header[15] === 0x4c || header[15] === 0x58)) {
    return { value: { file, extension: 'webp' } }
  }
  return { error: 'El contenido del archivo no corresponde a una imagen JPG, PNG o WebP válida.' }
}

export async function uploadAvatar(formData: FormData): Promise<AvatarResult> {
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null
  let uploadedPath: string | null = null
  let userId: string | null = null
  let committed = false
  try {
    supabase = await createClient()
    const { data: session, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !session.user) return { success: false, error: expiredSession }
    userId = session.user.id
    const input = await readAvatarFile(formData)
    if (!input.value) return { success: false, error: input.error }

    const { data: previous, error: profileError } = await supabase.from('profiles')
      .select('id, avatar_url').eq('id', userId).maybeSingle()
    if (profileError || !previous) {
      logAvatarFailure('upload', profileError ? 'profile_failed' : 'missing_profile')
      return { success: false, error: unavailable }
    }

    const path = `${userId}/${crypto.randomUUID()}.${input.value.extension}`
    const { error: uploadError } = await supabase.storage.from(avatarBucketName)
      .upload(path, input.value.file, { contentType: input.value.file.type, upsert: false, cacheControl: '3600' })
    if (uploadError) {
      logAvatarFailure('upload', 'storage_failed')
      return { success: false, error: unavailable }
    }
    uploadedPath = path
    const signedUrl = await signAvatarPath(supabase, path, userId)
    if (!signedUrl) {
      await deleteOwnedAvatar(supabase, path, userId)
      return { success: false, error: unavailable }
    }

    let update = supabase.from('profiles').update({ avatar_url: path }).eq('id', userId)
    update = previous.avatar_url === null ? update.is('avatar_url', null) : update.eq('avatar_url', previous.avatar_url)
    const { data: updated, error: updateError } = await update.select('id').maybeSingle()
    if (updateError || !updated) {
      logAvatarFailure('upload', updateError ? 'profile_failed' : 'concurrent_change')
      await deleteOwnedAvatar(supabase, path, userId)
      return { success: false, error: updateError ? unavailable : changedPhoto }
    }
    committed = true
    const cleanedUp = await deleteOwnedAvatar(supabase, previous.avatar_url, userId)
    revalidatePath('/', 'layout')
    return { success: true, avatarUrl: signedUrl, ...(!cleanedUp && { warning: cleanupWarning }) }
  } catch {
    logAvatarFailure('upload', 'unexpected_error')
    if (supabase && uploadedPath && userId && !committed) await deleteOwnedAvatar(supabase, uploadedPath, userId)
    return { success: false, error: unavailable }
  }
}

export async function removeAvatar(): Promise<AvatarResult> {
  try {
    const supabase = await createClient()
    const { data: session, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !session.user) return { success: false, error: expiredSession }
    const userId = session.user.id
    const { data: previous, error: profileError } = await supabase.from('profiles')
      .select('id, avatar_url').eq('id', userId).maybeSingle()
    if (profileError || !previous) {
      logAvatarFailure('remove', profileError ? 'profile_failed' : 'missing_profile')
      return { success: false, error: 'No pudimos quitar tu foto. Inténtalo de nuevo.' }
    }
    let update = supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
    update = previous.avatar_url === null ? update.is('avatar_url', null) : update.eq('avatar_url', previous.avatar_url)
    const { data: updated, error: updateError } = await update.select('id').maybeSingle()
    if (updateError || !updated) {
      logAvatarFailure('remove', updateError ? 'profile_failed' : 'concurrent_change')
      return { success: false, error: updateError ? 'No pudimos quitar tu foto. Inténtalo de nuevo.' : changedPhoto }
    }
    const cleanedUp = await deleteOwnedAvatar(supabase, previous.avatar_url, userId)
    revalidatePath('/', 'layout')
    return {
      success: true,
      avatarUrl: null,
      ...(!cleanedUp && { warning: 'Tu foto ya no aparece en el perfil, pero no pudimos eliminar el archivo anterior.' }),
    }
  } catch {
    logAvatarFailure('remove', 'unexpected_error')
    return { success: false, error: 'No pudimos quitar tu foto. Inténtalo de nuevo.' }
  }
}
