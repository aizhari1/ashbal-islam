'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { packageSize } from '@/lib/dues'

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
      message: 'اتحذفت من سجل المعلم — عدّاد الطالب ما اتغيّرش',
      deleted_id: id,
    }
  } catch (e: any) {
    return { error: e?.message || 'فشل الحذف' }
  }
}

/**
 * يضبط عدّاد الطالب فقط — بدون إضافة أو حذف حصص من سجل المعلم.
 * المعلم بيتحاسب بعدد أيام الحضور، مش برقم العداد.
 */
export async function setStudentLastSession(studentId: string, lastSessionNum: number) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

    const target = Math.max(0, Math.floor(Number(lastSessionNum) || 0))
    const sb = serviceClient()
    const { data: before } = await sb
      .from('students')
      .select('last_session_num, monthly_sessions, subscription_type')
      .eq('id', studentId)
      .maybeSingle()
    if (!before) return { error: 'طالب غير موجود' }

    const quota = packageSize(before)
    if (!Number.isFinite(target) || target < 0) return { error: 'رقم الحصة غير صالح' }
    if (quota > 0 && target > quota) return { error: `الحد الأقصى ${quota} (باقة الطالب)` }

    const from = Number(before.last_session_num) || 0
    const { error } = await sb.from('students').update({ last_session_num: target }).eq('id', studentId)
    if (error) return { error: error.message }
    await sb.from('activity_log').insert({
      actor_id: user.id,
      action: 'settle_student_counter',
      entity_type: 'student',
      entity_id: studentId,
      details: { from, to: target },
    })
    revalidateTeacherPaths()
    return {
      ok: true,
      last_session_num: target,
      message: `تم ✓ عدّاد الطالب ${from} ← ${target}${quota > 0 ? `/${quota}` : ''} — حصص المعلم ما اتغيّرتش، والحصة الجاية رقم ${quota > 0 && target >= quota ? 1 : target + 1}`,
    }
  } catch (e: any) {
    return { error: e?.message || 'فشل الحفظ' }
  }
}

/** يخلّي عدّاد الطالب = رقم آخر حصة حضور مسجّلة عند المعلم (بالتاريخ). */
export async function alignCounterToLatestSession(studentId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }
    const sb = serviceClient()
    const { data: rows } = await sb
      .from('attendance')
      .select('session_num, session_date, created_at')
      .eq('student_id', studentId)
      .in('status', ['حاضر', 'متأخر'])
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
    const latest = rows?.[0]
    if (!latest || !Number(latest.session_num)) return { error: 'مفيش حصة مسجّلة برقم عند المعلم' }
    const n = Number(latest.session_num)
    const { data: before } = await sb.from('students').select('last_session_num').eq('id', studentId).maybeSingle()
    const { error } = await sb
      .from('students')
      .update({ last_session_num: n, last_session_date: String(latest.session_date).slice(0, 10) })
      .eq('id', studentId)
    if (error) return { error: error.message }
    await sb.from('activity_log').insert({
      actor_id: user.id,
      action: 'align_counter',
      entity_type: 'student',
      entity_id: studentId,
      details: { from: before?.last_session_num ?? null, to: n },
    })
    revalidateTeacherPaths()
    return { success: true, last_session_num: n, message: `اتطابق العدّاد مع آخر حصة عند المعلم (${n}) · التالي ${n + 1}` }
  } catch (e: any) {
    return { error: e?.message || 'خطأ غير متوقع' }
  }
}
