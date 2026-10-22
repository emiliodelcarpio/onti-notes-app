function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, calendar: 'gregory', numberingSystem: 'latn',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute') }
}

export function toLocalDateTime(iso: string, timeZone: string): string {
  try {
    const date = new Date(iso)
    if (!Number.isFinite(date.getTime())) return ''
    const parts = localParts(date, timeZone)
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
  } catch {
    return ''
  }
}

export function fromLocalDateTime(value: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const [, yearText, monthText, dayText, hourText, minuteText] = match
  const year = Number(yearText), month = Number(monthText), day = Number(dayText)
  const hour = Number(hourText), minute = Number(minuteText)
  if (year < 100 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null
  const wallTime = Date.UTC(year, month - 1, day, hour, minute)
  const check = new Date(wallTime)
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null
  try {
    // Sample both sides of a time-zone transition; reject nonexistent local times.
    const candidates = new Set<number>()
    for (let hours = -48; hours <= 48; hours += 12) {
      const sample = wallTime + hours * 3_600_000
      const parts = localParts(new Date(sample), timeZone)
      const localTime = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute))
      const candidate = wallTime - (localTime - sample)
      if (toLocalDateTime(new Date(candidate).toISOString(), timeZone) === value) candidates.add(candidate)
    }
    if (!candidates.size) return null
    // A repeated time uses its first occurrence deterministically.
    return new Date(Math.min(...candidates)).toISOString()
  } catch {
    return null
  }
}
