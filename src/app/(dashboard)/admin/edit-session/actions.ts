'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { packageSize, validateSessionWithinPackage } from '@/lib/dues'

function todayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
}

function revalidateAll() {
  for (const p of [
    '/admin/edit-session',
    '/admin/students',
    '/admin/sessions-detail',
    '/admin/payroll',
    '/admin/session-settle',
    '/admin/attended',
    '/teacher',
    '/teacher/session',
    '/teacher/attendance',
    '/teacher/dues',
    '/teacher/students',
    '/supervisor/edit-student',
    '/supervisor/edit-session',
  ]) {
    revalidatePath(p)
  }
}

/**
 * تعديل رقم آخر حصة:
 * - زيادة → إضافة الحصص الناقصة فقط (مش من 1 تاني)
 * - تقليل → حذف الحصص الزائدة + تقاريرها من سجل المعلم
 */
export async function updateSessionNum(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const studentId = String(formData.get('student_id') || '')
  const rawLast = formData.get('last_session_num')
  const lastSessionDate = String(formData.get('last_session_date') || '') || null

  if (!studentId) return { error: 'اختر طالب' }

  const sb = serviceClient()
  const { data: before, error: beforeErr } = await sb
    .from('students')
    .select('id, name, last_session_num, teacher_id, session_duration, monthly_sessions, subscription_type')
    .eq('id', studentId)
    .maybeSingle()
  if (beforeErr) return { error: beforeErr.message }
  if (!before) return { error: 'الطالب غير موجود' }

  const storedLast = Number(before.last_session_num || 0)
  const { data: maxRow } = await sb
    .from('attendance')
    .select('session_num')
    .eq('student_id', studentId)
    .not('session_num', 'is', null)
    .order('session_num', { ascending: false })
    .limit(1)
  const maxAtt = maxRow?.[0]?.session_num != null ? Number(maxRow[0].session_num) : 0
  const oldLast = Math.max(storedLast, maxAtt)
  const teacherId = before.teacher_id || null

  // حقل فاضي → متغيّرش الرقم
  const lastSessionNum =
    rawLast === null || String(rawLast).trim() === ''
      ? oldLast
      : Math.max(0, Math.floor(Number(rawLast) || 0))

  const quota = packageSize(before)
  const check = validateSessionWithinPackage(lastSessionNum, quota)
  if (!check.ok) return { error: check.error }

  const addedSessions: number[] = []
  const removedSessions: number[] = []
  const removedReports: { session_num: number | null; session_date: string | null; notes: string | null }[] =
    []

  const { data: existingRows } = await sb
    .from('attendance')
    .select('session_num')
    .eq('student_id', studentId)
    .not('session_num', 'is', null)
    .limit(500)
  const existingNums = new Set(
    (existingRows || [])
      .map((r) => Number(r.session_num))
      .filter((n) => Number.isFinite(n) && n > 0)
  )

  if (lastSessionNum > oldLast && teacherId) {
    const today = lastSessionDate || todayKey()
    const duration = Number(before.session_duration) || 30
    for (let n = oldLast + 1; n <= lastSessionNum; n++) {
      if (existingNums.has(n)) continue
      const { error: attErr } = await sb.from('attendance').insert({
        student_id: studentId,
        teacher_id: teacherId,
        session_date: today,
        status: 'حاضر',
        session_num: n,
        session_duration: duration,
        notes: `تعديل إداري — حصة رقم ${n} (أُضيفت من لوحة الإدارة)`,
      })
      if (!attErr) {
        addedSessions.push(n)
        existingNums.add(n)
      }
    }
  }

  if (lastSessionNum < oldLast) {
    const { data: extra } = await sb
      .from('attendance')
      .select('id, session_num, session_date, notes, status')
      .eq('student_id', studentId)
      .gt('session_num', lastSessionNum)
      .limit(500)

    for (const row of extra ?? []) {
      removedReports.push({
        session_num: row.session_num,
        session_date: row.session_date,
        notes: row.notes,
      })
      const { error: delErr } = await sb.from('attendance').delete().eq('id', row.id)
      if (!delErr && row.session_num != null) {
        removedSessions.push(Number(row.session_num))
      }
    }
  }

  let resolvedDate = lastSessionDate
  if (!resolvedDate && removedSessions.length > 0) {
    const { data: lastAtt } = await sb
      .from('attendance')
      .select('session_date')
      .eq('student_id', studentId)
      .in('status', ['حاضر', 'متأخر'])
      .order('session_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    resolvedDate = lastAtt?.session_date ? String(lastAtt.session_date).slice(0, 10) : null
  }
  if (!resolvedDate && addedSessions.length > 0) resolvedDate = todayKey()

  const { error } = await sb
    .from('students')
    .update({
      last_session_num: lastSessionNum,
      last_session_date: resolvedDate || undefined,
    })
    .eq('id', studentId)

  if (error) return { error: error.message }

  await sb.from('activity_log').insert({
    action: 'session_num',
    entity_id: studentId,
    actor_id: user.id,
    details: {
      student_name: before.name,
      last_session_num: lastSessionNum,
      last_session_date: lastSessionDate,
      old_last_session_num: oldLast,
      stored_last: storedLast,
      max_attendance_num: maxAtt,
      added_session_nums: addedSessions,
      removed_session_nums: removedSessions,
      removed_reports: removedReports.slice(0, 20),
    },
  })

  revalidateAll()

  let message = 'تم الحفظ'
  if (removedSessions.length > 0) {
    message = `تم · اتشالت ${removedSessions.length} حصة وتقريرها من سجل المعلم (${removedSessions.join('، ')})`
  } else if (addedSessions.length > 0) {
    message = `تم · أُضيفت ${addedSessions.length} حصة ناقصة فقط (${addedSessions.join('، ')})`
  } else if (lastSessionNum === oldLast) {
    message = 'تم الحفظ · مفيش حصص اتضافت'
  }

  return {
    ok: true,
    addedSessions: addedSessions.length,
    removedSessions: removedSessions.length,
    message,
  }
}
