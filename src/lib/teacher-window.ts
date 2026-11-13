import { currentMonthKey, monthBounds } from '@/lib/dues'

type Sb = { from: (t: string) => any }

/**
 * نافذة عدّ حصص المعلم: من أول الشهر الحالي (بتصفّر لوحدها يوم 1)
 * ولو الإدارة سوّت راتبه الشهر ده، العدّ يبدأ من بعد تاريخ آخر تسوية.
 * (عدّاد الطالب "N من 12" منفصل تمامًا ومش متأثر بده)
 */
export async function teacherCountWindow(
  sb: Sb,
  teacher: { id: string; name?: string | null }
): Promise<{ key: string; start: string; end: string; settledOn: string | null; after: string | null }> {
  const key = currentMonthKey()
  const { start, end } = monthBounds(key)
  let settledOn: string | null = null
  try {
    const { data } = await sb
      .from('activity_log')
      .select('details, created_at')
      .eq('action', 'teacher_settlement')
      .gte('created_at', start + 'T00:00:00')
      .order('created_at', { ascending: false })
      .limit(200)
    for (const r of data || []) {
      const d: any = r.details || {}
      if (d.month && d.month !== key) continue
      const mine = d.teacher_id ? d.teacher_id === teacher.id : !!teacher.name && d.teacher_name === teacher.name
      if (!mine) continue
      const day = new Date(r.created_at).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
      if (!settledOn || day > settledOn) settledOn = day
    }
  } catch {
    settledOn = null
  }
  // الحصص اللي تاريخها > تاريخ التسوية بس هي اللي بتتعد بعد التسوية
  return { key, start, end, settledOn, after: settledOn }
}
