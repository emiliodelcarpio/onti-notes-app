// This module is shared with the browser. Only the public project configuration
// belongs here; privileged credentials must never be passed to these clients.
export function getPublicSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!rawUrl || !key || !/^sb_publishable_[A-Za-z0-9_-]{16,256}$/.test(key)) {
    throw new Error('Revisa la configuración pública de Supabase.')
  }
  const url = new URL(rawUrl)
  const localDevelopment = process.env.NODE_ENV !== 'production' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(localDevelopment && url.protocol === 'http:')) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('La conexión de Supabase requiere un origen HTTPS válido.')
  }
  return { url: url.origin, key }
}
