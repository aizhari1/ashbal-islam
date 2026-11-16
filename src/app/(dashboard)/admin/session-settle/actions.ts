'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { packageSize, validateSessionWithinPackage } from '@/lib/dues'

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

function isAdminFabricatedNote(notes: string | null | undefined): boolean {
  const t = String(notes || '')
  return (
    t.includes('تسوية إدارية') ||
    t.includes('تعديل إداري') ||
    t.includes('أُضيفت من لوحة') ||
    t.includes('مزامنة')
  )
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

    // التسوية مستقلة: حذف حصة من سجل المعلم ما بيغيّرش عدّاد الطالب
    const sid = studentId || row.student_id
    let lastSessionNum = 0
    if (sid) {
      const { data: st } = await sb.from('students').select('last_session_num').eq('id', sid).maybeSingle()
      lastSessionNum = Number(st?.last_session_num) || 0
    }

    revalidateTeacherPaths()
    return {
      ok: true,
      message: 'اتحذفت من سجل المعلم — عدّاد الطالب ما اتغيّرش',
      last_session_num: lastSessionNum,
      deleted_id: id,
    }
  } catch (e: any) {
    return { error: e?.message || 'فشل الحذف' }
  }
}

/**
 * تسوية عدّاد الطالب (5/8 مثلًا) — مستقلة تمامًا عن حصص المعلم:
 * بتغيّر رقم الطالب بس، ومش بتضيف ولا بتحذف أي حصة من سجل المعلم (المعلم بيتحاسب بالتاريخ يوم 1).
 * الحصة الجاية من غرفة التسميع بتكمّل من الرقم ده (5 → 6 → 7 ...).
 */
export async function setStudentLastSession(studentId: string, lastSessionNum: number) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (!['admin', 'supervisor'].includes(String(prof?.role))) return { error: 'للإدارة والإشراف فقط' }

    const target = Math.floor(Number(lastSessionNum))
    if (!Number.isFinite(target) || target < 0) return { error: 'رقم الحصة غير صالح' }
    const sb = serviceClient()
    const { data: before } = await sb
      .from('students')
      .select('last_session_num, monthly_sessions, subscription_type')
      .eq('id', studentId)
      .maybeSingle()
    if (!before) return { error: 'طالب غير موجود' }
    const quota = packageSize(before)
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
