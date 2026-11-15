/**
 * عدّاد الطالب (students.last_session_num) هو المرجع الوحيد لرقم الحصة.
 * سجل المعلم (attendance.session_num) ممكن تبقى فيه أرقام قديمة أو متعدّلة — فمينفعش نرجّع العدّاد لرقم آخر تقرير.
 * الدالة دي بتتعامل مع حذف/تغيير حصة بس: لو الحصة المحذوفة هي آخر حصة (أو رقمها مش معروف) العدّاد يرجع خطوة واحدة،
 * غير كده العدّاد ما بيتغيّرش.
 */
type Snap = { status?: string | null; session_num?: number | null } | null

const present = (s?: string | null) => s === 'حاضر' || s === 'متأخر'

export async function adjustCounterAfterChange(sb: any, studentId: string, before: Snap, after: Snap): Promise<number> {
  const { data: st } = await sb.from('students').select('last_session_num').eq('id', studentId).maybeSingle()
  const stored = Math.max(0, Number(st?.last_session_num) || 0)

  // لازم تكون حصة حضور اتشالت (حذف) أو اتحوّلت لغياب
  const removed = !!before && present(before.status) && !(after && present(after.status))
  if (!removed) return stored

  const n = before!.session_num == null ? null : Number(before!.session_num)
  // حصة قديمة (رقمها أقل من العدّاد الحالي) → العدّاد زي ما هو
  if (n !== null && n < stored) return stored

  const next = Math.max(0, stored - 1)
  if (next !== stored) await sb.from('students').update({ last_session_num: next }).eq('id', studentId)
  return next
}

/** توافق مع الاستدعاءات القديمة: (sb, studentId, removedNum) = حذف حصة حضور برقم معيّن */
export async function resyncStudentCounter(sb: any, studentId: string, removedNum?: number | null): Promise<number> {
  return adjustCounterAfterChange(sb, studentId, { status: 'حاضر', session_num: removedNum ?? null }, null)
}
