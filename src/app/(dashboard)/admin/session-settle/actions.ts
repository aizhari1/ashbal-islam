'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'

function revalidateTeacherPaths() {
  for (const p of [
    '/admin',
    '/admin/attended',
    '/admin/sessions-detail',
    '/admin/payroll',
    '/admin/students',
    '/admin/edit-session',
    '/admin/session-settle',
    '/admin/finance',
    '/admin/subscriptions-log',
    '/teacher',
    '/teacher/attendance',
    '/teacher/dues',
    '/teacher/students',
    '/teacher/session',
    '/supervisor/edit-student',
    '/supervisor/edit-session',
  ]) {
    revalidatePath(p)
  }
}

export async function deleteAttendanceRow(id: string, studentId?: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: 'معرّف غير صالح' }

    const sb = serviceClient()
    const { data: row } = await sb
      .from('attendance')
      .select('id, student_id, notes, session_date, session_num, status')
      .eq('id', id)
      .maybeSingle()
    if (!row) return { error: 'الحصة مش موجودة أو اتحذفت' }

    await sb.from('activity_log').insert({
      actor_id: user.id,
      action: 'delete_attendance_settle',
      entity_type: 'attendance',
      entity_id: id,
      details: {
        student_id: studentId || row.student_id,
        session_date: row.session_date,
        session_num: row.session_num,
        status: row.status,
      },
    })

    const { error } = await sb.from('attendance').delete().eq('id', id)
    if (error) return { error: error.message }

    revalidateTeacherPaths()
    return {
      ok: true,
      message: 'اتحذفت الحصة من سجل المعلم (عدّاد الطالب ما اتغيّرش)',
      deleted_id: id,
    }
  } catch (e: any) {
    return { error: e?.message || 'فشل الحذف' }
  }
}

/** إضافة حصة منسية لسجل المعلم (بتاريخ يحدده الأدمن) — من غير ما تلمس عدّاد الطالب. */
export async function addTeacherSession(studentId: string, date: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'تاريخ غير صالح' }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
    if (date > today) return { error: 'لا يمكن إضافة حصة بتاريخ مستقبلي' }
    const sb = serviceClient()
    const { data: st } = await sb.from('students').select('id, teacher_id, session_duration').eq('id', studentId).maybeSingle()
    if (!st) return { error: 'طالب غير موجود' }
    if (!st.teacher_id) return { error: 'الطالب مالوش معلم' }
    const { data: same } = await sb.from('attendance').select('id').eq('student_id', studentId).eq('session_date', date).limit(1)
    if (same && same.length) return { error: 'فيه حصة مسجّلة للطالب في اليوم ده بالفعل' }
    const { data: row, error } = await sb
      .from('attendance')
      .insert({
        student_id: studentId,
        teacher_id: st.teacher_id,
        session_date: date,
        status: 'حاضر',
        notes: 'أُضيفت من لوحة الإدارة (حصة منسية)',
        session_duration: st.session_duration || 30,
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    await sb.from('activity_log').insert({
      actor_id: user.id,
      action: 'add_teacher_session',
      entity_type: 'attendance',
      entity_id: row?.id,
      details: { student_id: studentId, teacher_id: st.teacher_id, session_date: date },
    })
    revalidateTeacherPaths()
    return { ok: true, message: `اتضافت حصة ${date} لسجل المعلم (عدّاد الطالب ما اتغيّرش)` }
  } catch (e: any) {
    return { error: e?.message || 'فشل الإضافة' }
  }
}
