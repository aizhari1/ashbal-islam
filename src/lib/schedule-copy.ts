import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAll } from '@/lib/dues-engine'

/**
 * ينسخ المواعيد المرتبطة بتاريخ من شهر لشهر بعده (المواعيد الأسبوعية الثابتة بدون تاريخ مش محتاجة نسخ).
 */
export async function copyDatedSchedule(sb: SupabaseClient, fromMonth: string, toMonth: string) {
  const [fy, fm] = fromMonth.split('-').map(Number)
  const [ty, tm] = toMonth.split('-').map(Number)
  if (!fy || !fm || !ty || !tm) return { error: 'شهور غير صالحة', inserted: 0 }

  const fromStart = `${fromMonth}-01`
  const fromLast = new Date(fy, fm, 0).getDate()
  const fromEnd = `${fromMonth}-${String(fromLast).padStart(2, '0')}`
  const toLast = new Date(ty, tm, 0).getDate()
  const toStart = `${toMonth}-01`
  const toEnd = `${toMonth}-${String(toLast).padStart(2, '0')}`

  // قراءة بالصفحات: .limit(5000) كانت بتتقصّ عند 1000 صف فالنسخ كان بيطلع ناقص (أو بيكرر مواعيد)
  const src = await fetchAll<any>((f, t) =>
    sb
      .from('schedule_entries')
      .select('student_id, teacher_id, day_of_week, start_time, duration_minutes, session_date, status, notes')
      .gte('session_date', fromStart)
      .lte('session_date', fromEnd)
      .order('id')
      .range(f, t)
  )
  const existing = await fetchAll<any>((f, t) =>
    sb
      .from('schedule_entries')
      .select('student_id, teacher_id, start_time, session_date')
      .gte('session_date', toStart)
      .lte('session_date', toEnd)
      .order('id')
      .range(f, t)
  )

  const seen = new Set((existing ?? []).map((e: any) => `${e.student_id || ''}|${e.teacher_id || ''}|${String(e.start_time || '').slice(0, 5)}|${e.session_date || ''}`))
  const rows: any[] = []
  for (const e of src ?? []) {
    const day = Number(String(e.session_date).slice(8, 10))
    const newDay = Math.min(day, toLast)
    const newDate = `${toMonth}-${String(newDay).padStart(2, '0')}`
    const key = `${e.student_id || ''}|${e.teacher_id || ''}|${String(e.start_time || '').slice(0, 5)}|${newDate}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({
      student_id: e.student_id,
      teacher_id: e.teacher_id,
      day_of_week: e.day_of_week,
      start_time: e.start_time,
      duration_minutes: e.duration_minutes,
      session_date: newDate,
      status: e.status || 'مجدول',
      notes: e.notes,
    })
  }
  if (rows.length) {
    const { error } = await sb.from('schedule_entries').insert(rows)
    if (error) return { error: error.message, inserted: 0 }
  }
  return { inserted: rows.length }
}
