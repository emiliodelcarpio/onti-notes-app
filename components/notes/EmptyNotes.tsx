import Icon from '@/components/ui/Icon'
import Button from '@/components/ui/Button'

type EmptyNotesProps = {
  filtered: boolean
  onCreate: (type: 'note' | 'reminder') => void
  onReset: () => void
}

export default function EmptyNotes({ filtered, onCreate, onReset }: EmptyNotesProps) {
  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center rounded-2xl border border-border bg-surface px-5 py-12 text-center sm:min-h-[480px] sm:px-8">
      <svg className="mb-6 h-40 w-56 text-accent sm:h-44 sm:w-64" viewBox="0 0 256 176" fill="none" aria-hidden="true" focusable="false">
        <ellipse cx="128" cy="153" rx="88" ry="14" fill="currentColor" opacity=".08" />
        <rect x="52" y="52" width="104" height="92" rx="9" transform="rotate(-12 52 52)" fill="currentColor" fillOpacity=".08" stroke="currentColor" strokeOpacity=".4" />
        <rect x="117" y="45" width="88" height="98" rx="9" transform="rotate(12 117 45)" fill="currentColor" fillOpacity=".08" stroke="currentColor" strokeOpacity=".4" />
        <rect x="80" y="28" width="99" height="113" rx="10" transform="rotate(-9 80 28)" fill="var(--surface-highlight)" stroke="currentColor" />
        <path d="m105 63 43-7m-40 23 57-9m-54 25 35-6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".7" />
        <path d="m63 24 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7Zm139 25 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7Zm-99-38 1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5 1.5-5Z" fill="currentColor" />
      </svg>
      <h2 className="max-w-xl text-xl font-semibold tracking-tight sm:text-2xl">
        {filtered ? 'No encontramos resultados' : 'Aún no tienes notas ni recordatorios'}
      </h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-muted sm:text-base">
        {filtered
          ? 'Prueba con otra búsqueda o ajusta los filtros para encontrar lo que necesitas.'
          : 'Comienza a capturar tus ideas, organiza tus pensamientos y guarda lo que te importa.'}
      </p>
      <div className="mt-7 flex w-full max-w-xl flex-col justify-center gap-3 sm:w-auto sm:flex-row">
        {filtered ? (
          <Button variant="secondary" onClick={onReset}><Icon name="filter" />Limpiar filtros</Button>
        ) : (
          <>
            <Button onClick={() => onCreate('note')}><Icon name="plus" />Crear primera nota</Button>
            <Button variant="secondary" onClick={() => onCreate('reminder')}><Icon name="calendar" />Nuevo recordatorio</Button>
          </>
        )}
      </div>
    </div>
  )
}
