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

export type RateStudent =
  | { teacher_session_rate?: number | null; price_per_session?: number | null }
  | null
  | undefined

/**
 * سعر حصة الطالب للمعلم:
 * 1) teacher_session_rate (المحدد صراحةً للمعلم) — بالقيمة اللي اتكتبت من غير حد أدنى
 * 2) الطلاب القدام اللي ملهمش قيمة: price_per_session ثم سعر المعلم الافتراضي ثم 25 (بحد أدنى 25 زي الأول)
 */
export function studentSessionRate(st: RateStudent, teacherDefault?: number): number {
  const dedicated = Number(st?.teacher_session_rate)
  if (dedicated > 0) return dedicated
  return sessionRate(st?.price_per_session, teacherDefault)
}

const PRESENT_STATUSES = ['حاضر', 'متأخر']

function isMissingRateColumn(err: { message?: string; code?: string } | null | undefined): boolean {
  return !!err && (err.code === '42703' || /teacher_session_rate/.test(String(err.message || '')))
}

/**
 * كل حصص الحضور (حاضر + متأخر) في مدى تاريخ، بالصفحات وبترتيب ثابت.
 * بتجيب سعر المعلم مع الطالب، ولو العمود لسه ماتضافش (migration 009) بترجع للسلوك القديم بدل ما تقع.
 */
export async function fetchPresentAttendance(
  supabase: SupabaseClient,
  opts: {
    start: string
    end: string
    teacherId?: string | null
    columns?: string
    studentCols?: string
  }
): Promise<any[]> {
  const base = opts.columns ?? 'id, teacher_id, student_id, session_date, status'
  const stBase = opts.studentCols ?? 'name, price_per_session'
  let withRate = true
  const out: any[] = []
  for (let off = 0; ; off += 1000) {
    let chunk: any[] | null = null
    for (;;) {
      let q = supabase
        .from('attendance')
        .select(`${base}, students(${stBase}${withRate ? ', teacher_session_rate' : ''})`)
        .in('status', PRESENT_STATUSES)
        .gte('session_date', opts.start)
        .lte('session_date', opts.end)
        .order('session_date', { ascending: true })
        .order('id', { ascending: true })
        .range(off, off + 999)
      if (opts.teacherId) q = q.eq('teacher_id', opts.teacherId)
      const res = await q
      if (res.error && withRate && isMissingRateColumn(res.error)) {
        withRate = false
        continue
      }
      if (res.error) throw new Error(`تعذّر جلب الحضور لحساب الراتب: ${res.error.message}`)
      chunk = res.data as any[]
      break
    }
    if (!chunk?.length) break
    out.push(...chunk)
    if (chunk.length < 1000) break
  }
  return out
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

  const attendance = await fetchPresentAttendance(supabase, {
    start: bounds.start,
    end: bounds.end,
    teacherId: opts.teacherId,
    columns: 'id, teacher_id, student_id, session_date, status',
    studentCols: 'name, price_per_session',
  })

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
    const rate = studentSessionRate(st, teacherDefaultRate[a.teacher_id])
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
