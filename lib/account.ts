import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { isThemePreference } from '@/lib/theme'
import { logProfileFailure } from '@/lib/profile-diagnostics'

// Request-scoped memoization shares the verified identity between layout and page.
export const getAccountData = cache(async () => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    const user = data.user
    try {
      const { data: profile, error: profileError, status } = await supabase.from('profiles')
        .select('id, full_name, avatar_url, theme_preference')
        .eq('id', user.id).maybeSingle()
      if (profileError) {
        logProfileFailure('load', 'request_failed', profileError.code, status)
        return { supabase, user, profile: null, profileError: 'unavailable' as const }
      }
      if (!profile) {
        logProfileFailure('load', 'missing_profile')
        return { supabase, user, profile: null, profileError: 'missing' as const }
      }
      if (!isThemePreference(profile.theme_preference)) {
        logProfileFailure('load', 'invalid_theme')
        return { supabase, user, profile: { ...profile, theme_preference: 'system' as const }, profileError: 'invalid_theme' as const }
      }
      return { supabase, user, profile, profileError: null }
    } catch {
      logProfileFailure('load', 'unexpected_error')
      return { supabase, user, profile: null, profileError: 'unavailable' as const }
    }
  } catch {
    return null
  }
})
