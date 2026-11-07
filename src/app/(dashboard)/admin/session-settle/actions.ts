'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function revalidateTeacherPaths() {
  for (const p of [
    '/admin/session-settle',
    '/admin/payroll',
    '/admin/edit-session',
    '/teacher',
    '/teacher/attendance',
    '/teacher/dues',
    '/teacher/students',
    '/supervisor/edit-student',
  ]) {
    revalidatePath(p)
  }
}

export async function deleteAttendanceRow(id: string, studentId?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const { error } = await supabase.from('attendance').delete().eq('id', id)
  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'delete_attendance_settle',
    entity_type: 'attendance',
    entity_id: id,
    details: { student_id: studentId },
  })

  revalidateTeacherPaths()
  return { ok: true }
}

export async function setStudentLastSession(studentId: string, lastSessionNum: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const n = Math.max(0, Number(lastSessionNum) || 0)
  const { data: before } = await supabase
    .from('students')
    .select('last_session_num, teacher_id, name, session_duration')
    .eq('id', studentId)
    .maybeSingle()
  if (!before) return { error: 'طالب غير موجود' }

  const old = Number(before.last_session_num || 0)
  const { error } = await supabase.from('students').update({ last_session_num: n }).eq('id', studentId)
  if (error) return { error: error.message }

  let added = 0
  let removed = 0
  const teacherId = before.teacher_id
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })

  if (n > old && teacherId) {
    for (let i = old + 1; i <= n; i++) {
      const { error: insErr } = await supabase.from('attendance').insert({
        student_id: studentId,
        teacher_id: teacherId,
        session_date: today,
        status: 'حاضر',
        session_num: i,
        session_duration: before.session_duration || 30,
        notes: `تسوية إدارية — حصة رقم ${i} · ${before.name}`,
      })
      if (!insErr) added++
    }
  }
  if (n < old) {
    const { data: extra } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', studentId)
      .gt('session_num', n)
    for (const row of extra ?? []) {
      const { error: delErr } = await supabase.from('attendance').delete().eq('id', row.id)
      if (!delErr) removed++
    }
  }

  revalidateTeacherPaths()
  return {
    ok: true,
    message:
      added > 0
        ? `تم · أُضيفت ${added} حصة عند المعلم`
        : removed > 0
          ? `تم · اتشالت ${removed} حصة زيادة`
          : 'تم تحديث رقم الحصة',
  }
}
