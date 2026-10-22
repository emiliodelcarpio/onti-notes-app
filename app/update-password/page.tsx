import type { Metadata } from 'next'
import AuthCard from '@/components/auth/AuthCard'
import UpdatePasswordForm from '@/components/auth/UpdatePasswordForm'

export const metadata: Metadata = { title: 'Elige una nueva contraseña | onti' }

export default function Page() {
  return <AuthCard icon="shield" title="Elige una nueva contraseña" description="Guarda una contraseña segura para tu cuenta."><UpdatePasswordForm /></AuthCard>
}
