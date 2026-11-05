'use server'

import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/courses'

/** حذف حصة من سجل الحضور (إدارة) — زي القديم: بيتحذف الحضور وبيرجع العدّاد، ونص التقرير بيتحفظ في سجل الأنشطة */
export async function adminDeleteSession(attendanceId: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!/^[0-9a-f-]{36}$/i.test(attendanceId)) return { error: 'معرّف غير صالح' }
  const sb = serviceClient()
  const { data: row } = await sb.from('attendance').select('id, student_id, teacher_id, session_date, status, session_num, notes').eq('id', attendanceId).maybeSingle()
  if (!row) return { error: 'الحصة غير موجودة' }

  // التقرير ما يتمسحش (زي القديم) — بنحفظ نسخة منه
  await sb.from('activity_log').insert({
    actor_id: auth.userId, action: 'deleted_session', entity_type: 'attendance', entity_id: row.student_id,
    details: { date: row.session_date, status: row.status, session_num: row.session_num, teacher_id: row.teacher_id, report: row.notes },
  })
  const { error } = await sb.from('attendance').delete().eq('id', attendanceId)
  if (error) return { error: error.message }
  if (row.status === 'حاضر' || row.status === 'متأخر') {
    const { data: st } = await sb.from('students').select('last_session_num').eq('id', row.student_id).maybeSingle()
    await sb.from('students').update({ last_session_num: Math.max(0, (st?.last_session_num || 0) - 1) }).eq('id', row.student_id)
  }
  revalidatePath('/admin/attended')
  revalidatePath('/admin/sessions-detail')
  return { success: true }
}
