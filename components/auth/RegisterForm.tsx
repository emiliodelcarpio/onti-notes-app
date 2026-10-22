'use client'

import { register } from '@/actions/auth'
import AuthForm from './AuthForm'

export default function RegisterForm() {
  return <AuthForm mode="register" action={register} />
}
