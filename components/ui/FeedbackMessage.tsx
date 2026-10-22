import type { ReactNode } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'

export default function FeedbackMessage({ icon, title, tone = 'neutral', className = '', children }: {
  icon: IconName; title?: string; tone?: 'neutral' | 'error' | 'success'; className?: string; children: ReactNode
}) {
  const toneClasses = {
    neutral: 'border-border bg-input text-foreground',
    error: 'border-danger-border bg-danger-surface text-danger',
    success: 'border-success-border bg-success-surface text-success',
  }

  return (
    <div className={`flex items-start gap-3 rounded-[var(--radius-control)] border p-3 text-sm leading-5 ${toneClasses[tone]} ${className}`}>
      <Icon name={icon} className="mt-0.5" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? `mt-0.5 ${tone === 'success' ? 'text-success-detail' : tone === 'neutral' ? 'text-muted' : ''}` : undefined}>{children}</div>
      </div>
    </div>
  )
}
