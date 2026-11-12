/**
 * يعيد ضبط عدّاد حصص الطالب بعد حذف/تعديل حصة.
 * القاعدة: لو فيه حضور متبقّي → آخر حضور هو الرقم. لو مفيش (طلاب مستوردين من الشيت القديم عدّادهم
 * ماله سجل حضور) → ما نصفّرش العدّاد: نرجّعه خطوة واحدة بس لو كان واقف على رقم الحصة المحذوفة.
 */
export async function resyncStudentCounter(sb: any, studentId: string, removedNum?: number | null): Promise<number> {
  const { data: st } = await sb.from('students').select('last_session_num, last_session_date').eq('id', studentId).maybeSingle()
  const stored = Math.max(0, Number(st?.last_session_num) || 0)

  const { data } = await sb
    .from('attendance')
    .select('session_num, session_date')
    .eq('student_id', studentId)
    .in('status', ['حاضر', 'متأخر'])
    .not('session_num', 'is', null)
    .order('session_date', { ascending: false })
    .order('session_num', { ascending: false })
    .limit(1)
  const last = data?.[0]

  let num: number
  const patch: Record<string, unknown> = {}
  if (last) {
    num = Math.max(0, Number(last.session_num) || 0)
    patch.last_session_date = last.session_date
  } else {
    const rn = Number(removedNum) || 0
    num = rn > 0 && stored === rn ? rn - 1 : stored
  }
  patch.last_session_num = num
  await sb.from('students').update(patch).eq('id', studentId)
  return num
}
