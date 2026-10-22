import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Falta la configuración pública de Supabase.')

  // Create a supabase client on the browser with project's credentials
  return createBrowserClient<Database>(url, key)
}
