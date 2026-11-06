/** تاريخ انضمام الطالب والمدة منذ الانضمام — يتحدّث تلقائياً كل يوم */

export function cairoToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
}

/** يفضّل join_date، وإلا created_at */
export function resolveJoinDate(student: {
  join_date?: string | null
  created_at?: string | null
}): string | null {
  if (student.join_date) return String(student.join_date).slice(0, 10)
  if (student.created_at) return String(student.created_at).slice(0, 10)
  return null
}

export function formatJoinDateAr(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const d = String(isoDate).slice(0, 10)
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return d
  }
}

/** مدة منذ تاريخ الانضمام بصيغة عربية (سنة / شهر / يوم) */
export function formatTenureAr(isoDate: string | null | undefined): string {
  if (!isoDate) return 'غير محدد'
  const start = new Date(String(isoDate).slice(0, 10) + 'T12:00:00')
  if (Number.isNaN(start.getTime())) return 'غير محدد'

  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' })
  )
  // نقارن بالتاريخ فقط
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (b < a) return 'اليوم'

  let years = b.getFullYear() - a.getFullYear()
  let months = b.getMonth() - a.getMonth()
  let days = b.getDate() - a.getDate()

  if (days < 0) {
    months -= 1
    const prev = new Date(b.getFullYear(), b.getMonth(), 0)
    days += prev.getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  if (years === 0 && months === 0 && days === 0) return 'اليوم'

  const parts: string[] = []
  if (years > 0) parts.push(years === 1 ? 'سنة' : years === 2 ? 'سنتين' : `${years} سنوات`)
  if (months > 0) parts.push(months === 1 ? 'شهر' : months === 2 ? 'شهرين' : `${months} أشهر`)
  if (days > 0 && years === 0) parts.push(days === 1 ? 'يوم' : days === 2 ? 'يومين' : `${days} أيام`)

  return parts.length ? parts.join(' و') : 'اليوم'
}

export function tenureLabel(student: {
  join_date?: string | null
  created_at?: string | null
}): { joinDate: string | null; joinAr: string; tenure: string } {
  const joinDate = resolveJoinDate(student)
  return {
    joinDate,
    joinAr: formatJoinDateAr(joinDate),
    tenure: formatTenureAr(joinDate),
  }
}
