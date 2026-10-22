// Public schema defined in squema.sql. Keep these types in sync with that file.
export type Database = {
  public: {
    Tables: {
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string | null
          type: 'note' | 'reminder'
          priority: 'low' | 'medium' | 'high'
          status: 'backlog' | 'pending' | 'in_progress' | 'in_review' | 'on_hold' | 'completed' | 'archived'
          color: 'indigo' | 'teal' | 'amber' | 'rose' | 'violet'
          remind_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          content?: string | null
          type?: Database['public']['Tables']['notes']['Row']['type']
          priority?: Database['public']['Tables']['notes']['Row']['priority']
          status?: Database['public']['Tables']['notes']['Row']['status']
          color?: Database['public']['Tables']['notes']['Row']['color']
          remind_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string | null
          type?: Database['public']['Tables']['notes']['Row']['type']
          priority?: Database['public']['Tables']['notes']['Row']['priority']
          status?: Database['public']['Tables']['notes']['Row']['status']
          color?: Database['public']['Tables']['notes']['Row']['color']
          remind_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          email: string | null
          theme_preference: 'system' | 'light' | 'dark'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          theme_preference?: Database['public']['Tables']['profiles']['Row']['theme_preference']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          theme_preference?: Database['public']['Tables']['profiles']['Row']['theme_preference']
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
