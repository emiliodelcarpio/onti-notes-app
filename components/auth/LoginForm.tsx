'use client'

import { login } from '@/actions/auth'
import AuthForm from './AuthForm'

export default function LoginForm() {
  return <AuthForm mode="login" action={login} />
}
