import Link from 'next/link'
import AuthCard from '@/components/auth/AuthCard'
import Icon from '@/components/ui/Icon'

export default function Page() {
  return <AuthCard icon="alert-circle" title="No pudimos verificar el enlace" description="El enlace no es válido o ha caducado. Puedes volver a solicitar instrucciones o iniciar sesión.">
    <div className="flex flex-col gap-3 text-accent">
      <Link href="/forgot-password" className="inline-flex min-h-11 items-center gap-2 rounded underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"><Icon name="key" /><span>Solicitar un enlace de recuperación</span></Link>
      <Link href="/register" className="inline-flex min-h-11 items-center gap-2 rounded underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"><Icon name="user-plus" />Volver al registro</Link>
      <Link href="/login" className="inline-flex min-h-11 items-center gap-2 rounded underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"><Icon name="login" />Iniciar sesión</Link>
    </div>
  </AuthCard>
}
