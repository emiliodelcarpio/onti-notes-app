'use client'

import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-dvh items-center justify-center px-5 py-12">
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-(--card-shadow)">
      <Icon name="alert-circle" className="mx-auto size-10 text-danger" />
      <h1 className="mt-5 text-xl font-semibold">No pudimos abrir tu espacio</h1>
      <p className="mt-3 text-sm leading-6 text-muted" role="alert">Ocurrió un error al cargar la página. Vuelve a intentarlo para continuar.</p>
      <div className="mt-6"><Button onClick={reset}>Volver a intentar</Button></div>
    </div>
  </main>
}
