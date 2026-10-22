'use client'

import { forgotPassword } from '@/actions/auth'
import AuthForm from './AuthForm'

export default function ForgotPasswordForm() {
  return <AuthForm mode="forgot" action={forgotPassword} />
}
