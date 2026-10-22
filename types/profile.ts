import type { Database } from '@/types/database'

// Only fields used by the account UI. The authenticated email comes from Auth.
export type Profile = Pick<Database['public']['Tables']['profiles']['Row'],
  'id' | 'full_name' | 'avatar_url' | 'theme_preference'>
export type ThemePreference = Profile['theme_preference']

export type AvatarResult =
  | { success: true; avatarUrl: string | null; warning?: string }
  | { success: false; error: string }
