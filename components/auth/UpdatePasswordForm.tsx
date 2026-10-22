'use client'

import { completePasswordRecovery } from '@/actions/auth'
import AuthForm from './AuthForm'

export default function UpdatePasswordForm() {
  return <AuthForm mode="update" action={completePasswordRecovery} />
}
