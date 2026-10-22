import type { Metadata } from 'next'
import AuthCard from '@/components/auth/AuthCard'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import { redirectIfAuthenticated } from '@/lib/auth'

export const metadata: Metadata = { title: 'Recupera tu acceso | onti' }

export default async function Page() {
  await redirectIfAuthenticated()

  return <AuthCard icon="key" title="Recupera tu acceso" description="Solicita las instrucciones para elegir una nueva contraseña."><ForgotPasswordForm /></AuthCard>
}
