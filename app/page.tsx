import { redirect } from 'next/navigation'
import Link from 'next/link'
import AccountMenu from '@/components/account/AccountMenu'
import RetryButton from '@/components/dashboard/RetryButton'
import NotesWorkspace from '@/components/notes/NotesWorkspace'
import FeedbackMessage from '@/components/ui/FeedbackMessage'
import Icon from '@/components/ui/Icon'
import { getAccountData } from '@/lib/account'
import { getNotesPage } from '@/lib/notes'
import type { NotesPage } from '@/types/notes'
import type { Profile } from '@/types/profile'

export default async function Home({ searchParams }: {
  searchParams: Promise<{ code?: string | string[]; sb_flow_id?: string | string[]; error?: string | string[]; error_code?: string | string[] }>
}) {
  const params = await searchParams
  if (params.error || params.error_code) redirect('/auth/error')
  if (typeof params.code === 'string' && params.code) {
    // Preserve older email links. The Route Handler exchanges and saves the session.
    const query = new URLSearchParams({ code: params.code })
    if (typeof params.sb_flow_id === 'string') query.set('sb_flow_id', params.sb_flow_id)
    redirect(`/auth/confirm?${query.toString()}`)
  }

  const account = await getAccountData()
  if (!account) redirect('/login')
  const { supabase, user } = account
  // A missing profile is reported below; never create one outside the SQL trigger.
  const profile: Profile = account.profile ?? {
    id: user.id, full_name: null, avatar_url: null, theme_preference: 'system',
  }
  const firstName = profile.full_name?.trim().split(/\s+/)[0]
  const profileErrorMessage = account.profileError === 'missing'
    ? 'Tu perfil todavía no está disponible. No pudimos recuperar tus preferencias guardadas.'
    : account.profileError === 'invalid_theme'
      ? 'No pudimos recuperar tu apariencia guardada. Vuelve a elegirla en el menú de cuenta.'
      : 'No pudimos cargar tu perfil. Algunas preferencias pueden mostrarse con sus valores iniciales.'
  let initialPage: NotesPage = { notes: [], nextCursor: null }
  let loadError: string | undefined
  try {
    initialPage = await getNotesPage(supabase, user.id, { type: 'all', status: 'all', priority: 'all', query: '' })
  } catch {
    loadError = 'Revisa tu conexión y vuelve a intentarlo. Tus notas guardadas no se han modificado.'
  }

  return <main className="min-h-dvh px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
    <div className="mx-auto min-h-[calc(100dvh-1.5rem)] max-w-[1480px] rounded-3xl border border-border bg-surface px-4 py-5 shadow-(--card-shadow) sm:min-h-[calc(100dvh-3rem)] sm:px-8 sm:py-6 lg:px-9">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" aria-label="onti, inicio" className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          <span className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-primary-from to-primary-to text-on-accent shadow-(--primary-shadow) sm:size-12"><Icon name="notebook" className="size-7" /></span>
          <span className="text-3xl font-semibold tracking-tight">onti</span>
        </Link>
        <AccountMenu profile={profile} email={user.email ?? ''} />
      </header>
      <div className="mt-10 sm:mt-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[42px]">{firstName ? `Hola, ${firstName}` : 'Hola, este es tu espacio'}</h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-muted sm:text-lg">Tu espacio para organizar tus ideas y no olvidar lo importante.</p>
      </div>
      {account.profileError && <div className="mt-5 flex flex-wrap items-center gap-3">
        <FeedbackMessage tone="error" icon="alert-circle" className="flex-1">{profileErrorMessage}</FeedbackMessage>
        <RetryButton />
      </div>}
      <NotesWorkspace initialPage={initialPage} loadError={loadError} />
    </div>
  </main>
}
