/** نفس قاعدة الأصل: يظهر بعد اكتمال حصص الباقة بعد آخر دفعة؛ يختفي بعد تسجيل دفعة جديدة */

export type ReminderStudent = {
  id: string
  code: string
  name: string
  phone: string | null
  status: string
  subscription_type: string | null
  amount_due: number
  last_session_num: number | null
  last_session_date: string | null
  price_per_session: number | null
  teacher_name: string
}

export type ReminderRow = ReminderStudent & {
  sessions_taken: number
  due_date: string
  reason: string
  outstanding: number
}

function packageSize(s: ReminderStudent): number {
  const raw = String(s.subscription_type || '')
  const m = raw.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

const EXCLUDE = /منسحب|انسحاب|متوقف|موقوف|تجريبي/

export function computeDueReminders(
  students: ReminderStudent[],
  lastPay: Record<string, { day: string; months: number }>,
  attDays: Record<string, string[]>
): ReminderRow[] {
  const out: ReminderRow[] = []

  for (const s of students) {
    const status = String(s.status || 'نشط')
    if (EXCLUDE.test(status)) continue

    const pkg = packageSize(s)
    const days = attDays[s.id] || []
    const lp = lastPay[s.id]
    const dueAmt = Number(s.amount_due || 0)
    let since = 0
    let dueDate = ''
    let reason = ''

    if (lp) {
      if (pkg <= 0) continue
      const after = days.filter((d) => d > lp.day)
      since = after.length
      const need = pkg * (lp.months || 1)
      if (since < need) continue
      dueDate = after[need - 1] || after[after.length - 1] || ''
      reason = `أكمل ${since} حصة بعد آخر دفعة (${lp.day})`
    } else {
      since = Math.max(days.length, Number(s.last_session_num) || 0)
      if (pkg > 0) {
        if (since < pkg) continue
        dueDate = days[pkg - 1] || s.last_session_date || ''
        reason = `أكمل ${since} حصة ولا توجد دفعة مسجّلة`
      } else {
        if (dueAmt <= 0) continue
        dueDate = s.last_session_date || ''
        reason = 'عليه مستحق بدون باقة محددة'
      }
    }

    const price = Number(s.price_per_session || 0)
    const outstanding = dueAmt > 0 ? dueAmt : price * (pkg || 1)

    out.push({
      ...s,
      sessions_taken: since,
      due_date: dueDate,
      reason,
      outstanding,
      teacher_name: s.teacher_name,
    })
  }

  out.sort((a, b) => b.sessions_taken - a.sessions_taken)
  return out
}
