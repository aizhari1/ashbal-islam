'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { packageSize, validateSessionWithinPackage } from '@/lib/dues'

function revalidateTeacherPaths() {
  for (const p of [
    '/admin/session-settle',
    '/admin/payroll',
    '/admin/attended',
    '/admin/edit-session',
    '/admin/sessions-detail',
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
        report: row.notes,
      },
    })

    const { error } = await sb.from('attendance').delete().eq('id', id)
    if (error) return { error: error.message }

    const sid = studentId || row.student_id
    if (sid) {
      const { data } = await sb
        .from('attendance')
        .select('session_num, session_date')
        .eq('student_id', sid)
        .in('status', ['حاضر', 'متأخر'])
        .order('session_date', { ascending: false })
        .order('session_num', { ascending: false })
        .limit(1)
      const last = data?.[0]
      await sb
        .from('students')
        .update({
          last_session_num: last?.session_num != null ? Number(last.session_num) : 0,
          last_session_date: last?.session_date || null,
        })
        .eq('id', sid)
    }

    revalidateTeacherPaths()
    return { ok: true }
  } catch (e: any) {
    return { error: e?.message || 'فشل الحذف' }
  }
}

export async function setStudentLastSession(studentId: string, lastSessionNum: number) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

    const n = Math.max(0, Number(lastSessionNum) || 0)
    const sb = serviceClient()
    const { data: before } = await sb
      .from('students')
      .select('last_session_num, teacher_id, name, session_duration, monthly_sessions, subscription_type')
      .eq('id', studentId)
      .maybeSingle()
    if (!before) return { error: 'طالب غير موجود' }

    const quota = packageSize(before)
    const check = validateSessionWithinPackage(n, quota)
    if (!check.ok) return { error: check.error }

    const old = Number(before.last_session_num || 0)
    const { error } = await sb.from('students').update({ last_session_num: n }).eq('id', studentId)
    if (error) return { error: error.message }

    let added = 0
    let removed = 0
    const teacherId = before.teacher_id
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })

    if (n > old && teacherId) {
      for (let i = old + 1; i <= n; i++) {
        const { error: insErr } = await sb.from('attendance').insert({
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
      const { data: extra } = await sb
        .from('attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('status', 'حاضر')
        .gt('session_num', n)
        .order('session_date', { ascending: false })
        .limit(Math.max(1, old - n + 5))
      for (const row of extra ?? []) {
        const { error: delErr } = await sb.from('attendance').delete().eq('id', row.id)
        if (!delErr) removed++
        if (removed >= old - n) break
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
  } catch (e: any) {
    return { error: e?.message || 'فشل التحديث' }
  }
}
