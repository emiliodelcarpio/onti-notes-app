import type { ReactNode } from 'react'
import Icon from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'

export default function AuthCard({ icon, title, description, children }: {
  icon: IconName; title: string; description: string; children: ReactNode
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8 sm:py-12">
      <section aria-labelledby="auth-title" className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-(--card-shadow) sm:p-7">
        <header className="mb-7 flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-auth-icon-border bg-auth-icon-bg text-auth-icon-fg">
            <Icon name={icon} className="size-6" />
          </div>
          <div className="min-w-0">
            <h1 id="auth-title" className="text-xl font-semibold leading-6 tracking-tight">{title}</h1>
            <p className="mt-1.5 text-[13px] leading-5 text-muted">{description}</p>
          </div>
        </header>
        {children}
      </section>
    </main>
  )
}
