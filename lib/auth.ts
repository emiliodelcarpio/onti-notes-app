import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function redirectIfAuthenticated(): Promise<void> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (!error && data.user) redirect('/')
}
