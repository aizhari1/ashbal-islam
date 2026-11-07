/**
 * مصدر واحد لمستحقات المعلم — نفس الحساب في الإدارة ومسير الرواتب وصفحة المعلم.
 * القاعدة: كل حصة حاضر أو متأخر × سعر حصة الطالب (حد أدنى 25 ج)
 * الافتراضي: الشهر الحالي (توقيت القاهرة)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { currentMonthKey } from '@/lib/dues'

export const DEFAULT_SESSION_RATE = 25

export function monthBounds(key?: string | null) {
  if (key === 'all') {
    return { start: '2020-01-01', end: '2099-12-31', label: 'كل الشهور', key: 'all' }
  }
  const resolved = key && /^\d{4}-\d{2}$/.test(key) ? key : currentMonthKey()
  const y = Number(resolved.slice(0, 4))
  const m = Number(resolved.slice(5, 7))
  if (!y || !m) {
    const cur = currentMonthKey()
    return monthBounds(cur)
  }
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  const label = new Date(y, m - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
  return { start, end, label, key: `${y}-${String(m).padStart(2, '0')}` }
}

export function sessionRate(pricePerSession: number | null | undefined, teacherDefault?: number) {
  const p = Number(pricePerSession)
  if (p > 0) return Math.max(DEFAULT_SESSION_RATE, p)
  const t = Number(teacherDefault)
  if (t > 0) return Math.max(DEFAULT_SESSION_RATE, t)
  return DEFAULT_SESSION_RATE
}

export type TeacherPayRow = {
  teacherId: string
  teacherName: string
  sessions: number
  salary: number
  rates: Record<number, number>
  rateParts: string
}

export type SessionLine = {
  session_date: string
  student_id: string
  student_name: string
  rate: number
}

/** يجلب حضور حاضر/متأخر في المدى ويحسب الراتب لكل معلم */
export async function computeTeacherPayroll(
  supabase: SupabaseClient,
  opts: { month?: string | null; teacherId?: string | null } = {}
): Promise<{ rows: TeacherPayRow[]; linesByTeacher: Record<string, SessionLine[]>; bounds: ReturnType<typeof monthBounds> }> {
  const bounds = monthBounds(opts.month == null || opts.month === '' ? currentMonthKey() : opts.month)

  const attendance: any[] = []
  let off = 0
  while (true) {
    let q = supabase
      .from('attendance')
      .select('teacher_id, student_id, session_date, status, students(name, price_per_session)')
      .in('status', ['حاضر', 'متأخر'])
      .gte('session_date', bounds.start)
      .lte('session_date', bounds.end)
      .range(off, off + 999)
    if (opts.teacherId) q = q.eq('teacher_id', opts.teacherId)
    const { data: chunk } = await q
    if (!chunk?.length) break
    attendance.push(...chunk)
    if (chunk.length < 1000) break
    off += 1000
    if (off > 50000) break
  }

  const { data: rateLogs } = await supabase
    .from('activity_log')
    .select('entity_id, details')
    .eq('action', 'teacher_session_rate')

  const teacherDefaultRate: Record<string, number> = {}
  for (const r of rateLogs ?? []) {
    const rate = Number((r.details as any)?.session_rate || 0)
    if (r.entity_id && rate > 0) teacherDefaultRate[r.entity_id] = rate
  }

  const byTeacher: Record<string, { sessions: number; salary: number; rates: Record<number, number> }> = {}
  const linesByTeacher: Record<string, SessionLine[]> = {}

  for (const a of attendance) {
    if (!a.teacher_id) continue
    const st = a.students as any
    const rate = sessionRate(st?.price_per_session, teacherDefaultRate[a.teacher_id])
    if (!byTeacher[a.teacher_id]) byTeacher[a.teacher_id] = { sessions: 0, salary: 0, rates: {} }
    const agg = byTeacher[a.teacher_id]
    agg.sessions += 1
    agg.salary += rate
    agg.rates[rate] = (agg.rates[rate] || 0) + 1
    ;(linesByTeacher[a.teacher_id] = linesByTeacher[a.teacher_id] || []).push({
      session_date: String(a.session_date).slice(0, 10),
      student_id: a.student_id,
      student_name: st?.name || '—',
      rate,
    })
  }

  const rows: TeacherPayRow[] = Object.entries(byTeacher).map(([teacherId, agg]) => ({
    teacherId,
    teacherName: '',
    sessions: agg.sessions,
    salary: agg.salary,
    rates: agg.rates,
    rateParts: Object.entries(agg.rates)
      .map(([rate, cnt]) => `${cnt}×${rate}`)
      .join(' + '),
  }))

  return { rows, linesByTeacher, bounds }
}

export async function computeOneTeacherPay(
  supabase: SupabaseClient,
  teacherId: string,
  month?: string | null
): Promise<{ sessions: number; salary: number; rateParts: string; lines: SessionLine[]; bounds: ReturnType<typeof monthBounds> }> {
  const { rows, linesByTeacher, bounds } = await computeTeacherPayroll(supabase, {
    month: month == null || month === '' ? currentMonthKey() : month,
    teacherId,
  })
  const row = rows.find((r) => r.teacherId === teacherId)
  return {
    sessions: row?.sessions || 0,
    salary: row?.salary || 0,
    rateParts: row?.rateParts || `0×${DEFAULT_SESSION_RATE}`,
    lines: linesByTeacher[teacherId] || [],
    bounds,
  }
}
