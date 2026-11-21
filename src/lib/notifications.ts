import { serviceClient } from '@/lib/supabase/service'
import { todayKey } from '@/lib/dues'

export type NotifKind = 'missed_session' | 'today_sessions' | 'admin' | 'system' | 'dues'

export type AppNotification = {
  id: string
  user_id: string
  kind: string
  title: string
  body: string
  url: string | null
  dedupe_key: string | null
  read_at: string | null
  created_at: string
}

/** يوم الأسبوع بتوقيت القاهرة (0=أحد … 6=سبت) */
export function cairoDayOfWeek(d = new Date()): number {
  const cairo = new Date(d.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }))
  return cairo.getDay()
}

export function cairoNowParts(d = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]))
  const hour = Number(parts.hour)
  const minute = Number(parts.minute)
  const date = `${parts.year}-${parts.month}-${parts.day}`
  return { hour, minute, date, minutesOfDay: hour * 60 + minute }
}

function parseTimeToMinutes(t: string | null): number | null {
  if (!t) return null
  const m = String(t).match(/(\d{1,2}):(\d{2})/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

/** إنشاء إشعار مع منع التكرار بنفس dedupe_key */
export async function createNotification(input: {
  userId: string
  kind: NotifKind | string
  title: string
  body: string
  url?: string | null
  dedupeKey?: string | null
}) {
  const sb = serviceClient()
  if (input.dedupeKey) {
    const { data: existing } = await sb
      .from('notifications')
      .select('id')
      .eq('user_id', input.userId)
      .eq('dedupe_key', input.dedupeKey)
      .maybeSingle()
    if (existing?.id) return { id: existing.id, created: false }
  }
  const { data, error } = await sb
    .from('notifications')
    .insert({
      user_id: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      dedupe_key: input.dedupeKey ?? null,
    })
    .select('id')
    .maybeSingle()
  if (error) {
    if (/duplicate|unique/i.test(error.message) && input.dedupeKey) {
      return { id: null, created: false }
    }
    throw new Error(error.message)
  }
  return { id: data?.id ?? null, created: true }
}

/**
 * يولّد إشعارات للمعلمين:
 * - ملخص حصص اليوم
 * - بعد مرور موعد الحصة بدون تسجيل: «فاتتك حصة»
 */
export async function generateTeacherSessionReminders() {
  const sb = serviceClient()
  const today = todayKey()
  const dow = cairoDayOfWeek()
  const { minutesOfDay } = cairoNowParts()
  const stats = { todaySummaries: 0, missed: 0, teachers: 0 }

  const { data: entries, error } = await sb
    .from('schedule_entries')
    .select(
      'id, teacher_id, student_id, day_of_week, session_date, start_time, duration_minutes, students(name, code), teachers(id, name, profile_id)'
    )
    .or(`day_of_week.eq.${dow},session_date.eq.${today}`)
    .limit(2000)
  if (error) throw new Error(error.message)

  const todayEntries = (entries || []).filter((e: any) => {
    if (e.session_date && String(e.session_date).slice(0, 10) === today) return true
    if (e.day_of_week != null && Number(e.day_of_week) === dow && !e.session_date) return true
    if (e.day_of_week != null && Number(e.day_of_week) === dow) return true
    return false
  })

  const { data: attendance } = await sb
    .from('attendance')
    .select('student_id, teacher_id, status')
    .eq('session_date', today)
    .limit(5000)
  const done = new Set(
    (attendance || []).map((a: any) => `${a.teacher_id || ''}:${a.student_id}`)
  )

  const byTeacher = new Map<string, { profileId: string; name: string; rows: any[] }>()
  for (const e of todayEntries) {
    const tid = e.teacher_id
    const profileId = e.teachers?.profile_id
    if (!tid || !profileId) continue
    if (!byTeacher.has(tid)) {
      byTeacher.set(tid, { profileId, name: e.teachers?.name || 'معلم', rows: [] })
    }
    byTeacher.get(tid)!.rows.push(e)
  }
  stats.teachers = byTeacher.size

  for (const [tid, pack] of byTeacher) {
    const pending = pack.rows.filter((e) => !done.has(`${tid}:${e.student_id}`))
    const recorded = pack.rows.length - pending.length

    if (pack.rows.length > 0) {
      const r = await createNotification({
        userId: pack.profileId,
        kind: 'today_sessions',
        title: `جدولك النهاردة · ${pack.rows.length} حصة`,
        body:
          pending.length > 0
            ? `متبقي ${pending.length} حصة من غير تسجيل · تم ${recorded}`
            : `اتسجّلت كل حصص اليوم (${recorded}) — أحسنت`,
        url: '/teacher/session',
        dedupeKey: `today:${tid}:${today}`,
      })
      if (r.created) stats.todaySummaries++
    }

    for (const e of pending) {
      const startMin = parseTimeToMinutes(e.start_time)
      const dur = Number(e.duration_minutes) || 30
      if (startMin == null) continue
      const endPlus = startMin + dur + 15
      if (minutesOfDay < endPlus) continue

      const studentName = e.students?.name || 'طالب'
      const code = e.students?.code || ''
      const timeLabel = String(e.start_time || '').slice(0, 5)
      const r = await createNotification({
        userId: pack.profileId,
        kind: 'missed_session',
        title: `فاتتك حصة · ${studentName}`,
        body: `موعد ${timeLabel} · ${studentName}${code ? ` (${code})` : ''} — سجّل الحضور أو غيّب الطالب`,
        url: '/teacher/session',
        dedupeKey: `missed:${tid}:${today}:${e.student_id}`,
      })
      if (r.created) stats.missed++
    }
  }

  return stats
}

export async function listUserNotifications(userId: string, limit = 40) {
  const sb = serviceClient()
  const { data, error } = await sb
    .from('notifications')
    .select('id, user_id, kind, title, body, url, dedupe_key, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data || []) as AppNotification[]
}

export async function countUnread(userId: string) {
  const sb = serviceClient()
  const { count, error } = await sb
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) return 0
  return count ?? 0
}
