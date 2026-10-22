import type { Metadata } from 'next'
import AuthCard from '@/components/auth/AuthCard'
import RegisterForm from '@/components/auth/RegisterForm'
import { redirectIfAuthenticated } from '@/lib/auth'

export const metadata: Metadata = { title: 'Crea tu cuenta | onti' }

export default async function Page() {
  await redirectIfAuthenticated()

  return <AuthCard icon="user-plus" title="Crea tu cuenta" description="Un espacio para organizar tus ideas. Solo necesitas tu correo y una contraseña."><RegisterForm /></AuthCard>
}
