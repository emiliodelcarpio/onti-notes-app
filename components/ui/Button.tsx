import type { ButtonHTMLAttributes } from 'react'
import Icon from './Icon'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  pending?: boolean
}

export default function Button({ children, variant = 'primary', pending = false, disabled, className = '', type = 'button', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-linear-to-b from-primary-from to-primary-to text-on-accent shadow-(--primary-shadow) enabled:hover:brightness-(--primary-hover-brightness) disabled:from-primary-disabled-bg disabled:to-primary-disabled-bg disabled:text-primary-disabled-text',
    secondary: 'border border-input-border bg-surface text-foreground enabled:hover:bg-surface-highlight disabled:opacity-60',
    danger: 'border border-danger-border bg-danger-surface text-danger enabled:hover:border-danger disabled:opacity-60',
    ghost: 'text-muted enabled:hover:bg-surface-highlight enabled:hover:text-foreground disabled:opacity-60',
  }
  return <button {...props} type={type} disabled={disabled || pending} aria-busy={pending || undefined}
    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:shadow-none motion-reduce:transition-none ${variants[variant]} ${className}`}>
    {pending && <Icon name="loader" className="size-4 motion-safe:animate-spin" />}
    {children}
  </button>
}
