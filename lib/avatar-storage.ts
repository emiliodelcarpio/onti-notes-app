import 'server-only'

import { avatarBucketName, getOwnedAvatarPath, isLegacyAvatarUrl } from '@/lib/avatar'
import type { createClient } from '@/lib/supabase/server'

type AvatarClient = Awaited<ReturnType<typeof createClient>>
type AvatarOperation = 'load' | 'upload' | 'remove' | 'cleanup'
type AvatarFailure = 'storage_failed' | 'profile_failed' | 'missing_profile' | 'concurrent_change' | 'invalid_path' | 'unexpected_error'

export function logAvatarFailure(operation: AvatarOperation, reason: AvatarFailure) {
  // Signed URLs, object names, provider messages, and identity data stay out of logs.
  console.error(`[avatar.${operation}]`, { reason })
}

export async function signAvatarPath(supabase: AvatarClient, path: string, userId: string): Promise<string | null> {
  const ownedPath = getOwnedAvatarPath(path, userId)
  if (!ownedPath) {
    logAvatarFailure('load', 'invalid_path')
    return null
  }
  try {
    const { data, error } = await supabase.storage.from(avatarBucketName).createSignedUrl(ownedPath, 3600)
    if (error || !data?.signedUrl) {
      logAvatarFailure('load', 'storage_failed')
      return null
    }
    return data.signedUrl
  } catch {
    logAvatarFailure('load', 'unexpected_error')
    return null
  }
}

export async function resolveAvatarUrl(supabase: AvatarClient, value: string | null, userId: string): Promise<string | null> {
  if (value === null) return null
  if (getOwnedAvatarPath(value, userId)) return signAvatarPath(supabase, value, userId)
  if (isLegacyAvatarUrl(value)) return value
  logAvatarFailure('load', 'invalid_path')
  return null
}

export async function deleteOwnedAvatar(supabase: AvatarClient, value: string | null, userId: string): Promise<boolean> {
  const path = getOwnedAvatarPath(value, userId)
  // Legacy URLs and objects belonging to another user must never be deleted.
  if (!path) return true
  try {
    const { error } = await supabase.storage.from(avatarBucketName).remove([path])
    if (!error) return true
    logAvatarFailure('cleanup', 'storage_failed')
  } catch {
    logAvatarFailure('cleanup', 'unexpected_error')
  }
  return false
}
