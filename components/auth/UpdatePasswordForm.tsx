'use client'

import { updatePassword } from '@/actions/auth'
import AuthForm from './AuthForm'

export default function UpdatePasswordForm() {
  return <AuthForm mode="update" action={updatePassword} />
}
