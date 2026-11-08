'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { packageSize, validateSessionWithinPackage } from '@/lib/dues'

function revalidateAll() {
  for (const p of [
    '/supervisor/edit-student',
    '/supervisor/edit-session',
    '/admin/students',
    '/admin/edit-session',
    '/admin/session-settle',
    '/admin/sessions-detail',
    '/admin/payroll',
    '/teacher',
    '/teacher/session',
    '/teacher/attendance',
    '/teacher/dues',
    '/teacher/students',
    '/supervisor',
  ]) {
    revalidatePath(p)
  }
}

/**
 * تعديل بيانات الطالب فقط.
 * لا يضيف ولا يحذف حصص من سجل المعلم — المزامنة من صفحة التسوية / تعديل رقم الحصة.
 */
export async function supervisorEditStudent(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const studentId = String(formData.get('student_id') || '')
  if (!studentId) return { error: 'اختر طالب' }

  const sb = serviceClient()
  const { data: before, error: beforeErr } = await sb
    .from('students')
    .select(
      'id, name, code, last_session_num, teacher_id, session_duration, price_per_session, monthly_sessions, subscription_type'
    )
    .eq('id', studentId)
    .maybeSingle()
  if (beforeErr) return { error: beforeErr.message }
  if (!before) return { error: 'الطالب غير موجود' }

  const oldLast = Number(before.last_session_num || 0)
  const rawLast = formData.get('last_session_num')
  const newLast =
    rawLast === null || String(rawLast).trim() === ''
      ? oldLast
      : Math.max(0, Math.floor(Number(rawLast) || 0))

  const formQuota = Number(formData.get('monthly_sessions') || 0)
  const quota = formQuota > 0 ? formQuota : packageSize(before)
  const check = validateSessionWithinPackage(newLast, quota)
  if (!check.ok) return { error: check.error }

  const newTeacherId = String(formData.get('teacher_id') || '') || null
  const joinRaw = String(formData.get('join_date') || '').trim()

  const payload: Record<string, unknown> = {
    name: String(formData.get('name') || '').trim() || undefined,
    phone: String(formData.get('phone') || '') || null,
    monthly_sessions: Number(formData.get('monthly_sessions') || 0) || null,
    session_duration: Number(formData.get('session_duration') || 30) || 30,
    last_session_num: newLast,
    amount_due: Number(formData.get('amount_due') || 0),
    price_per_session: Number(formData.get('price_per_session') || 25),
    teacher_id: newTeacherId,
  }
  if (joinRaw) payload.join_date = joinRaw.slice(0, 10)

  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

  const { error: upErr } = await sb.from('students').update(payload).eq('id', studentId)
  if (upErr) return { error: upErr.message }

  await sb.from('activity_log').insert({
    actor_id: user.id,
    action: 'supervisor_edit_student',
    entity_type: 'student',
    entity_id: studentId,
    details: {
      name: payload.name,
      last_session_num: newLast,
      old_last_session_num: oldLast,
      note: 'data_only_no_attendance_sync',
    },
  })

  revalidateAll()

  let message = 'تم حفظ بيانات الطالب'
  if (newLast !== oldLast) {
    message =
      `تم حفظ الرقم ${newLast} على ملف الطالب فقط. ` +
      `لم يُمس سجل المعلم. للمزامنة (إضافة/حذف حصص المعلم) استخدم «التسوية» أو «تعديل رقم الحصة».`
  }

  return {
    ok: true,
    addedSessions: 0,
    removedSessions: 0,
    oldLastSessionNum: oldLast,
    newLastSessionNum: newLast,
    message,
  }
}
