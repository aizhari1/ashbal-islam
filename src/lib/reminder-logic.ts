/** منطق تذكير المستحقات — بدون I/O (قابل للاختبار). */

export type ReminderStudent = {
  id: string
  code: string
  name: string
  phone: string | null
  status: string | null
  subscription_type: string | null
  monthly_sessions?: number | null
  amount_due: number
  manual_due?: number | null
  last_session_num: number | null
  last_session_date: string | null
  price_per_session: number | null
  teacher_name?: string | null
}

export type LastPay = {
  day: string
  months: number
  residual: number
}

export type ReminderRow = {
  id: string
  code: string
  name: string
  phone: string | null
  outstanding: number
  sessions_taken: number
  due_date: string
  teacher_name: string
  reason: string
}

function packageSize(s: ReminderStudent): number {
  const n = Number(s.monthly_sessions)
  if (n > 0) return n
  const m = String(s.subscription_type || '').match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

function packagePrice(s: ReminderStudent): number {
  const per = Number(s.price_per_session || 0)
  const size = packageSize(s)
  if (per > 0 && size > 0) return Math.round(per * size * 100) / 100
  return Number(s.amount_due || 0)
}

/**
 * يحسب من يجب تذكيرهم بالدفع:
 * - خلّصوا حصص الباقة بعد آخر دفعة
 * - أو عندهم متبقٍّ من دفعة جزئية
 * - + مستحق يدوي (manual_due) لو موجود
 */
export function computeDueReminders(
  students: ReminderStudent[],
  lastPay: Record<string, LastPay>,
  attDays: Record<string, string[]>
): ReminderRow[] {
  const out: ReminderRow[] = []

  for (const s of students) {
    if (s.status && s.status !== 'نشط' && s.status !== 'active') continue

    const size = packageSize(s)
    const lp = lastPay[s.id]
    const days = attDays[s.id] || []

    let sessionsAfterPay = 0
    if (lp?.day) {
      sessionsAfterPay = days.filter((d) => d > lp.day).length
    } else {
      sessionsAfterPay = days.length
    }

    const residual = Number(lp?.residual || 0)
    let packagesOwed = 0
    let packageDue = false
    let dueDate = ''
    let reason = ''

    if (size > 0 && sessionsAfterPay >= size) {
      packagesOwed = Math.floor(sessionsAfterPay / size)
      packageDue = packagesOwed > 0
      // تاريخ استحقاق تقريبي: يوم آخر حصة في الباقة المكتملة
      const idx = size * packagesOwed - 1
      const after = lp?.day ? days.filter((d) => d > lp.day) : days
      dueDate = after[idx] || after[after.length - 1] || s.last_session_date || ''
      reason = `أكمل ${packagesOwed} باقة (${sessionsAfterPay}/${size} حصة بعد آخر دفعة)`
    }

    const price = packageDue ? packagePrice(s) * packagesOwed : 0
    const manual = Math.max(0, Number(s.manual_due || 0))
    const outstanding = price + residual + manual
    if (outstanding <= 0) continue

    if (manual > 0) {
      const m = `مستحق مسجّل يدويًا ${manual}`
      reason = reason ? `${reason} · ${m}` : m
      if (!dueDate) dueDate = lp?.day || s.last_session_date || ''
    }

    if (residual > 0) {
      const partial = `متبقٍّ ${residual} بعد دفعة جزئية (${lp?.day})`
      reason = reason ? `${reason} · ${partial}` : partial
      if (!dueDate) dueDate = lp?.day || ''
    }

    out.push({
      id: s.id,
      code: s.code,
      name: s.name,
      phone: s.phone,
      outstanding: Math.round(outstanding * 100) / 100,
      sessions_taken: sessionsAfterPay,
      due_date: dueDate,
      teacher_name: s.teacher_name || '—',
      reason: reason || 'مستحق',
    })
  }

  return out.sort((a, b) => b.outstanding - a.outstanding)
}
