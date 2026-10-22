import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { getPublicSupabaseConfig } from './config'

export function createClient() {
  const { url, key } = getPublicSupabaseConfig()

  // Create a supabase client on the browser with project's credentials
  return createBrowserClient<Database>(url, key, {
    cookieOptions: { secure: process.env.NODE_ENV === 'production', sameSite: 'lax' },
  })
}
