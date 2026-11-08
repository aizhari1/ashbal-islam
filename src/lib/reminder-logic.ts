/** نفس قاعدة الأصل: يظهر بعد اكتمال حصص الباقة بعد آخر دفعة؛ يختفي بعد تسجيل دفعة تغطّيه */

export type ReminderStudent = {
  id: string
  code: string
  name: string
  phone: string | null
  status: string
  subscription_type: string | null
  monthly_sessions?: number | null
  amount_due: number
  last_session_num: number | null
  last_session_date: string | null
  price_per_session: number | null
  teacher_name: string
}

export type LastPay = { day: string; months: number; residual?: number }

export type ReminderRow = ReminderStudent & {
  sessions_taken: number
  due_date: string
  reason: string
  outstanding: number
}

export function packageSize(s: {
  subscription_type?: string | null
  monthly_sessions?: number | null
}): number {
  const n = Number(s.monthly_sessions)
  if (n > 0) return n
  const m = String(s.subscription_type || '').match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

export function packagePrice(s: {
  subscription_type?: string | null
  monthly_sessions?: number | null
  price_per_session?: number | null
}): number {
  const pkg = packageSize(s)
  const rate = Number(s.price_per_session) > 0 ? Number(s.price_per_session) : 25
  return pkg > 0 ? pkg * rate : 0
}

const EXCLUDE = /منسحب|انسحاب|متوقف|موقوف|تجريبي/

export function computeDueReminders(
  students: ReminderStudent[],
  lastPay: Record<string, LastPay>,
  attDays: Record<string, string[]>
): ReminderRow[] {
  const out: ReminderRow[] = []

  for (const s of students) {
    const status = String(s.status || 'نشط')
    if (EXCLUDE.test(status)) continue

    const pkg = packageSize(s)
    const days = attDays[s.id] || []
    const lp = lastPay[s.id]
    const residual = Math.max(0, Number(lp?.residual || 0))
    let since = 0
    let dueDate = ''
    let reason = ''
    let packageDue = false
    // عدد الباقات المستحقة (الأصل كان بيحسب باقة واحدة بس حتى لو الطالب خلّص أكتر من باقة بدون دفع)
    let packagesOwed = 1

    if (lp) {
      const after = days.filter((d) => d > lp.day)
      if (after.length > 0) {
        since = after.length
      } else if (days.length === 0 && (!s.last_session_date || String(s.last_session_date).slice(0, 10) > lp.day)) {
        since = Number(s.last_session_num) || 0
      } else {
        since = 0
      }
      if (pkg > 0) {
        const need = pkg * (lp.months || 1)
        if (since >= need) {
          packageDue = true
          // أول باقة مستحقة عند إكمال المدفوع (need)، وبعدها باقة جديدة كل pkg حصص
          packagesOwed = Math.max(1, Math.floor((since - need) / pkg) + 1)
          dueDate = after[need - 1] || after[after.length - 1] || s.last_session_date || ''
          reason = `أكمل ${since} حصة بعد آخر دفعة (${lp.day})`
        }
      }
    } else {
      since = Math.max(days.length, Number(s.last_session_num) || 0)
      if (pkg > 0 && since >= pkg) {
        packageDue = true
        dueDate = days[pkg - 1] || s.last_session_date || ''
        reason = `أكمل ${since} حصة ولا توجد دفعة مسجّلة`
      }
    }

    const price = packageDue ? packagePrice(s) * packagesOwed : 0
    const outstanding = price + residual
    if (outstanding <= 0) continue

    if (residual > 0) {
      const partial = `متبقٍّ ${residual} بعد دفعة جزئية (${lp?.day})`
      reason = reason ? `${reason} · ${partial}` : partial
      if (!dueDate) dueDate = lp?.day || ''
    }

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
