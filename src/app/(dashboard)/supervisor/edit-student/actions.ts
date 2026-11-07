'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { packageSize, validateSessionWithinPackage } from '@/lib/dues'

function todayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
}

function revalidateAll() {
  for (const p of [
    '/supervisor/edit-student',
    '/admin/students',
    '/admin/edit-session',
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
 * تعديل طالب + مزامنة رقم الحصة مع سجل المعلم:
 * - زيادة الرقم → إضافة حصص حاضر في attendance للمعلم
 * - تقليل الرقم → حذف الحصص الزائدة (session_num أكبر من الرقم الجديد)
 * - رقم الحصة لا يتجاوز حجم الباقة
 */
export async function supervisorEditStudent(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const studentId = String(formData.get('student_id') || '')
  if (!studentId) return { error: 'اختر طالب' }

  const { data: before, error: beforeErr } = await supabase
    .from('students')
    .select('id, name, code, last_session_num, teacher_id, session_duration, price_per_session, monthly_sessions, subscription_type')
    .eq('id', studentId)
    .maybeSingle()
  if (beforeErr) return { error: beforeErr.message }
  if (!before) return { error: 'الطالب غير موجود' }

  const newLastSessionNum = Math.max(0, Number(formData.get('last_session_num') || 0))
  const formQuota = Number(formData.get('monthly_sessions') || 0)
  const quota = formQuota > 0 ? formQuota : packageSize(before)
  const check = validateSessionWithinPackage(newLastSessionNum, quota)
  if (!check.ok) return { error: check.error }

  const oldLastSessionNum = Number(before.last_session_num || 0)
  const newTeacherId = String(formData.get('teacher_id') || '') || null
  const effectiveTeacherId = newTeacherId || before.teacher_id || null

  const joinRaw = String(formData.get('join_date') || '').trim()

  const payload: Record<string, unknown> = {
    name: String(formData.get('name') || '').trim() || undefined,
    phone: String(formData.get('phone') || '') || null,
    monthly_sessions: Number(formData.get('monthly_sessions') || 0) || null,
    session_duration: Number(formData.get('session_duration') || 30) || 30,
    last_session_num: newLastSessionNum,
    amount_due: Number(formData.get('amount_due') || 0),
    price_per_session: Number(formData.get('price_per_session') || 25),
    teacher_id: newTeacherId,
  }
  if (joinRaw) payload.join_date = joinRaw.slice(0, 10)

  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

  const { error: upErr } = await supabase.from('students').update(payload).eq('id', studentId)
  if (upErr) return { error: upErr.message }

  const addedSessions: number[] = []
  const removedSessions: number[] = []
  const duration = Number(payload.session_duration) || Number(before.session_duration) || 30
  const today = todayKey()

  if (newLastSessionNum > oldLastSessionNum && effectiveTeacherId) {
    for (let n = oldLastSessionNum + 1; n <= newLastSessionNum; n++) {
      const offsetDays = n - oldLastSessionNum - 1
      const d = new Date(today + 'T12:00:00')
      d.setDate(d.getDate() - offsetDays)
      const sessionDate = d.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })

      const { error: insErr } = await supabase.from('attendance').insert({
        student_id: studentId,
        teacher_id: effectiveTeacherId,
        session_date: sessionDate,
        status: 'حاضر',
        session_num: n,
        session_duration: duration,
        notes: `*💦أشبال الإسلام💦*\n\nتعديل إداري — حصة رقم ${n}\nالطالب: ${before.name}\n(أُضيفت من لوحة الإشراف/الإدارة)`,
      })
      if (!insErr) addedSessions.push(n)
      else {
        await supabase
          .from('attendance')
          .update({
            status: 'حاضر',
            session_num: n,
            teacher_id: effectiveTeacherId,
            notes: `تعديل إداري — حصة رقم ${n} (مزامنة)`,
          })
          .eq('student_id', studentId)
          .eq('session_num', n)
        addedSessions.push(n)
      }
    }
  }

  if (newLastSessionNum < oldLastSessionNum) {
    const { data: extra } = await supabase
      .from('attendance')
      .select('id, session_num')
      .eq('student_id', studentId)
      .gt('session_num', newLastSessionNum)
      .limit(200)
    for (const row of extra ?? []) {
      const { error: delErr } = await supabase.from('attendance').delete().eq('id', row.id)
      if (!delErr && row.session_num != null) removedSessions.push(Number(row.session_num))
    }
  }

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'supervisor_edit_student',
    entity_type: 'student',
    entity_id: studentId,
    details: {
      ...payload,
      old_last_session_num: oldLastSessionNum,
      added_session_nums: addedSessions,
      removed_session_nums: removedSessions,
      synced_to_teacher: addedSessions.length > 0 || removedSessions.length > 0,
    },
  })

  revalidateAll()

  let message = 'تم حفظ التعديلات بنجاح'
  if (addedSessions.length > 0) {
    message = `تم الحفظ · أُضيفت ${addedSessions.length} حصة لسجل المعلم (${addedSessions.join('، ')})`
  } else if (removedSessions.length > 0) {
    message = `تم الحفظ · اتشالت ${removedSessions.length} حصة زيادة من سجل المعلم`
  }

  return {
    ok: true,
    addedSessions: addedSessions.length,
    removedSessions: removedSessions.length,
    message,
  }
}
