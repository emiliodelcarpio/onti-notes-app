export default function Loading() {
  return <main aria-busy="true" aria-label="Cargando tu espacio" className="mx-auto w-full max-w-[1440px] p-6 sm:p-10">
    <div className="space-y-6 motion-safe:animate-pulse">
      <div className="h-12 w-36 rounded-xl bg-surface-highlight" />
      <div className="h-10 w-64 rounded-xl bg-surface-highlight" />
      <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-16 rounded-2xl bg-surface-highlight" />)}</div>
      <div className="flex min-h-80 items-center justify-center rounded-2xl border border-border bg-surface text-muted">Cargando tu espacio…</div>
    </div>
  </main>
}
