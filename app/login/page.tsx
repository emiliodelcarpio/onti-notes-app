import type { Metadata } from 'next'
import AuthCard from '@/components/auth/AuthCard'
import LoginForm from '@/components/auth/LoginForm'
import FeedbackMessage from '@/components/ui/FeedbackMessage'
import { redirectIfAuthenticated } from '@/lib/auth'

export const metadata: Metadata = { title: 'Bienvenido de nuevo | onti' }

export default async function Page({ searchParams }: {
  searchParams: Promise<{ registered?: string | string[] }>
}) {
  await redirectIfAuthenticated()
  const { registered } = await searchParams

  return (
    <AuthCard icon="login" title="Bienvenido de nuevo" description="Accede a tu espacio personal de notas y recordatorios.">
      {registered === '1' && (
        <div className="mb-5">
          <FeedbackMessage icon="check-circle" tone="success" title="¡Registro completado!">
            Revisa tu correo y la carpeta de spam para confirmar tu cuenta antes de iniciar sesión. Si ya tenías una cuenta, puedes iniciar sesión o recuperar tu contraseña.
          </FeedbackMessage>
        </div>
      )}
      <LoginForm />
    </AuthCard>
  )
}
