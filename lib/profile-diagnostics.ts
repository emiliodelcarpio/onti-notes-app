type Operation = 'load' | 'update' | 'theme'
type Reason = 'request_failed' | 'missing_profile' | 'invalid_theme' | 'unexpected_error'

export function logProfileFailure(operation: Operation, reason: Reason, code?: string, status?: number) {
  // Log only diagnostic codes; provider messages can contain personal data.
  console.error(`[profile.${operation}]`, {
    reason,
    code: code && /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(code) ? code : 'unknown',
    status: typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? status : null,
  })
}
