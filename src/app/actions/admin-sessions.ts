'use server'

import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/courses'

async function syncStudentLastSession(
  sb: ReturnType<typeof serviceClient>,
  studentId: string
): Promise<number> {
  const { data } = await sb
    .from('attendance')
    .select('session_num, session_date')
    .eq('student_id', studentId)
    .in('status', ['حاضر', 'متأخر'])
    .order('session_date', { ascending: false })
    .order('session_num', { ascending: false })
    .limit(5)

  const last = (data || [])[0]
  const lastNum = last?.session_num != null ? Number(last.session_num) : 0
  await sb
    .from('students')
    .update({
      last_session_num: lastNum,
      last_session_date: last?.session_date || null,
    })
    .eq('id', studentId)
  return lastNum
}

/** حذف حصة من الإدارة — بيمسح الصف دايمًا ويظبط عدّاد الطالب */
export async function adminDeleteSession(attendanceId: string) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return { error: auth.error }
    if (!/^[0-9a-f-]{36}$/i.test(attendanceId)) return { error: 'معرّف غير صالح' }

    const sb = serviceClient()
    const { data: row, error: fetchErr } = await sb
      .from('attendance')
      .select('id, student_id, teacher_id, session_date, status, session_num, notes')
      .eq('id', attendanceId)
      .maybeSingle()
    if (fetchErr) return { error: fetchErr.message }
    if (!row) return { error: 'الحصة غير موجودة أو اتحذفت قبل كده' }

    await sb.from('activity_log').insert({
      actor_id: auth.userId,
      action: 'deleted_session',
      entity_type: 'attendance',
      entity_id: row.student_id,
      details: {
        attendance_id: row.id,
        date: row.session_date,
        status: row.status,
        session_num: row.session_num,
        teacher_id: row.teacher_id,
        report: row.notes,
      },
    })

    const { error } = await sb.from('attendance').delete().eq('id', attendanceId)
    if (error) return { error: `فشل الحذف: ${error.message}` }

    let lastSessionNum: number | null = null
    if (row.student_id) {
      lastSessionNum = await syncStudentLastSession(sb, row.student_id)
    }

    for (const path of [
      '/admin/attended',
      '/admin/sessions-detail',
      '/admin/payroll',
      '/admin/session-settle',
      '/admin/edit-session',
      '/teacher/attendance',
      '/teacher',
      '/teacher/dues',
      '/supervisor/edit-student',
    ]) {
      revalidatePath(path)
    }
    return {
      success: true,
      message: 'اتحذفت الحصة من عند الجميع واتظبط العدّاد',
      last_session_num: lastSessionNum,
      deleted_id: attendanceId,
    }
  } catch (e: any) {
    return { error: e?.message || 'خطأ غير متوقع أثناء الحذف' }
  }
}
