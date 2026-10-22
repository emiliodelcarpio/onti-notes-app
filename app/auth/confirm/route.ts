import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function redirectAfterConfirmation(request: NextRequest, path: '/' | '/update-password' | '/auth/error') {
  const response = NextResponse.redirect(new URL(path, request.url))
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.has('error') || request.nextUrl.searchParams.has('error_code')) {
    return redirectAfterConfirmation(request, '/auth/error')
  }

  const code = request.nextUrl.searchParams.get('code')
  const flowId = request.nextUrl.searchParams.get('sb_flow_id')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  try {
    if (code) {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined)
      if (!error && data.session) {
        // Older emails may return to / without a type. The SDK also returns
        // the recovery marker stored with the original PKCE verifier.
        const isRecovery = type === 'recovery' || ('redirectType' in data && data.redirectType === 'recovery')
        return redirectAfterConfirmation(request, isRecovery ? '/update-password' : '/')
      }
    } else if (tokenHash && (type === 'email' || type === 'signup' || type === 'recovery')) {
      const supabase = await createClient()
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      if (!error) {
        return redirectAfterConfirmation(request, type === 'recovery' ? '/update-password' : '/')
      }
    }
  } catch {
    // Do not disclose codes, tokens or provider error details.
  }
  return redirectAfterConfirmation(request, '/auth/error')
}
