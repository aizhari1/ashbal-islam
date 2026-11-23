'use server'

import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { requireStaff } from '@/lib/auth-guards'

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
    const staff = await requireStaff()
    if (!staff.ok || !staff.userId) return { error: staff.error || 'غير مصرح' }
    const user = { id: staff.userId }
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
    const staff = await requireStaff()
    if (!staff.ok || !staff.userId) return { error: staff.error || 'غير مصرح' }
    const user = { id: staff.userId }
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

/** حصص طالب في شهر معيّن (قراءة بالسيرفر عشان الـRLS متخفيش الصفوف). */
export async function getStudentSessions(studentId: string, month: string) {
  try {
    const staff = await requireStaff()
    if (!staff.ok || !staff.userId) return { error: staff.error || 'غير مصرح', sessions: [] as any[] }
    const user = { id: staff.userId }
    if (!/^[0-9a-f-]{36}$/i.test(studentId)) return { error: 'معرّف غير صالح', sessions: [] as any[] }
    if (!/^\d{4}-\d{2}$/.test(month)) return { error: 'شهر غير صالح', sessions: [] as any[] }
    const sb = serviceClient()
    const [y, m] = month.split('-').map(Number)
    const last = new Date(y, m, 0).getDate()
    const { data, error } = await sb
      .from('attendance')
      .select('id, session_date, session_num, status, notes, session_duration, teachers(name)')
      .eq('student_id', studentId)
      .gte('session_date', `${month}-01`)
      .lte('session_date', `${month}-${String(last).padStart(2, '0')}`)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) return { error: error.message, sessions: [] as any[] }
    return {
      sessions: (data || []).map((r: any) => {
        const t = Array.isArray(r.teachers) ? r.teachers[0] : r.teachers
        return {
          id: r.id as string,
          session_date: String(r.session_date).slice(0, 10),
          session_num: r.session_num as number | null,
          status: r.status as string,
          notes: r.notes as string | null,
          session_duration: r.session_duration as number | null,
          teacher_name: (t?.name as string) || '—',
        }
      }),
    }
  } catch (e: any) {
    return { error: e?.message || 'فشل تحميل الحصص', sessions: [] as any[] }
  }
}
