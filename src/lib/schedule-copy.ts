import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * ينسخ المواعيد المرتبطة بتاريخ من شهر لشهر بعده (المواعيد الأسبوعية الثابتة بدون تاريخ مش محتاجة نسخ).
 * آمن للتكرار: أي موعد موجود في شهر الهدف بيتخطّى.
 */
export async function copyDatedSchedule(sb: SupabaseClient, fromMonth: string, toMonth: string) {
  const [fy, fm] = fromMonth.split('-').map(Number)
  const [ty, tm] = toMonth.split('-').map(Number)
  if (!fy || !fm || !ty || !tm) return { error: 'شهور غير صالحة', inserted: 0 }
  const fromStart = `${fromMonth}-01`
  const fromEnd = `${fromMonth}-${String(new Date(fy, fm, 0).getDate()).padStart(2, '0')}`
  const toLast = new Date(ty, tm, 0).getDate()
  const toStart = `${toMonth}-01`
  const toEnd = `${toMonth}-${String(toLast).padStart(2, '0')}`

  const { data: src } = await sb
    .from('schedule_entries')
    .select('student_id, teacher_id, day_of_week, start_time, duration_minutes, session_date, status, notes')
    .gte('session_date', fromStart)
    .lte('session_date', fromEnd)
    .limit(5000)
  const { data: existing } = await sb
    .from('schedule_entries')
    .select('student_id, teacher_id, start_time, session_date')
    .gte('session_date', toStart)
    .lte('session_date', toEnd)
    .limit(8000)

  const seen = new Set((existing ?? []).map((e: any) => `${e.student_id || ''}|${e.teacher_id || ''}|${String(e.start_time || '').slice(0, 5)}|${e.session_date || ''}`))
  const rows: any[] = []
  for (const e of src ?? []) {
    const day = Math.min(Number(String(e.session_date).slice(8, 10)), toLast)
    const newDate = `${toMonth}-${String(day).padStart(2, '0')}`
    const key = `${e.student_id || ''}|${e.teacher_id || ''}|${String(e.start_time || '').slice(0, 5)}|${newDate}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({
      student_id: e.student_id, teacher_id: e.teacher_id,
      day_of_week: new Date(`${newDate}T12:00:00Z`).getUTCDay(),
      start_time: e.start_time, duration_minutes: e.duration_minutes || 30,
      session_date: newDate, status: e.status || 'مجدول', notes: e.notes,
    })
  }
  let inserted = 0
  for (let i = 0; i < rows.length; i += 200) {
    const { data, error } = await sb.from('schedule_entries').insert(rows.slice(i, i + 200)).select('id')
    if (error) return { error: error.message, inserted }
    inserted += data?.length || 0
  }
  return { inserted, candidates: src?.length || 0 }
}
