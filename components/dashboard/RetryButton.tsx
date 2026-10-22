'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function RetryButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return <Button variant="secondary" pending={pending} onClick={() => startTransition(() => router.refresh())}>Volver a intentar</Button>
}
