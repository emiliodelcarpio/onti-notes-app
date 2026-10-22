'use client'

import { useRef, useState } from 'react'
import { deleteNote } from '@/actions/notes'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/ToastProvider'
import type { Note } from '@/types/notes'

type DeleteNoteDialogProps = {
  note: Note
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteNoteDialog({ note, onClose, onDeleted }: DeleteNoteDialogProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const deleting = useRef(false)
  const { showToast } = useToast()

  async function handleDelete() {
    if (deleting.current) return
    deleting.current = true
    setPending(true)
    setError('')
    try {
      const result = await deleteNote(note.id)
      if (!result.success) {
        setError(result.error ?? 'No pudimos eliminar el contenido. Inténtalo de nuevo.')
        return
      }
      showToast(note.type === 'reminder' ? 'Recordatorio eliminado' : 'Nota eliminada', 'El contenido se eliminó de tu espacio.')
      onDeleted()
    } catch {
      setError('No pudimos conectar con el servidor. Inténtalo de nuevo.')
    } finally {
      deleting.current = false
      setPending(false)
    }
  }

  return (
    <Modal open onClose={onClose} busy={pending} title={note.type === 'reminder' ? '¿Eliminar este recordatorio?' : '¿Eliminar esta nota?'} description="Esta acción es permanente y no se puede deshacer.">
      <p className="mb-5 rounded-xl border border-border bg-background p-4 text-sm font-medium wrap-anywhere">{note.title}</p>
      {error && <p role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-danger-border bg-danger-surface p-3 text-sm leading-6 text-danger"><Icon name="alert-circle" className="mt-0.5" />{error}</p>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={pending} onClick={onClose}>Cancelar</Button>
        <Button variant="danger" pending={pending} onClick={() => { void handleDelete() }}>{pending ? 'Eliminando…' : <><Icon name="trash" />Eliminar</>}</Button>
      </div>
    </Modal>
  )
}
