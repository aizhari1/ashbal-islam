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
    '/supervisor/edit-student',
    '/supervisor/edit-session',
    '/admin/students',
    '/admin/edit-session',
    '/admin/sessions-detail',
    '/admin/payroll',
    '/admin/session-settle',
    '/admin/attended',
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

/** أعلى رقم حصة موجود فعليًا في سجل الحضور */
async function maxAttendanceSessionNum(
  sb: ReturnType<typeof serviceClient>,
  studentId: string
): Promise<number> {
  const { data } = await sb
    .from('attendance')
    .select('session_num')
    .eq('student_id', studentId)
    .not('session_num', 'is', null)
    .order('session_num', { ascending: false })
    .limit(1)
  const n = data?.[0]?.session_num
  return n != null && Number.isFinite(Number(n)) ? Number(n) : 0
}

/**
 * تعديل طالب + مزامنة رقم الحصة مع سجل المعلم:
 * - الرقم الحالي = الأكبر بين (آخر رقم محفوظ) و (أعلى رقم في الحضور)
 * - زيادة → يضيف فقط الأرقام الناقصة (مش من 1 تاني)
 * - تقليل → يحذف الحصص اللي رقمها أكبر من الرقم الجديد
 * - الحقل الفاضي ما بيرجّعش لصفر بالغلط
 */
export async function supervisorEditStudent(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const studentId = String(formData.get('student_id') || '')
  if (!studentId) return { error: 'اختر طالب' }

  // service client: قراءة موثوقة بدون RLS يرجّع last_session_num = null/0 بالغلط
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

  const maxAtt = await maxAttendanceSessionNum(sb, studentId)
  const storedLast = Number(before.last_session_num || 0)
  // الرقم الحقيقي الحالي = الأكبر عشان ما نضيفش من الصفر لو العداد ناقص عن السجل
  const oldLastSessionNum = Math.max(storedLast, maxAtt)

  const rawLast = formData.get('last_session_num')
  // لو الحقل فاضي أو مش متبعت → نخلي الرقم زي ما هو (ما نرجّعش لصفر)
  let newLastSessionNum: number
  if (rawLast === null || String(rawLast).trim() === '') {
    newLastSessionNum = oldLastSessionNum
  } else {
    newLastSessionNum = Math.max(0, Math.floor(Number(rawLast) || 0))
  }

  const formQuota = Number(formData.get('monthly_sessions') || 0)
  const quota = formQuota > 0 ? formQuota : packageSize(before)
  const check = validateSessionWithinPackage(newLastSessionNum, quota)
  if (!check.ok) return { error: check.error }

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

  const { error: upErr } = await sb.from('students').update(payload).eq('id', studentId)
  if (upErr) return { error: upErr.message }

  const addedSessions: number[] = []
  const removedSessions: number[] = []
  const duration = Number(payload.session_duration) || Number(before.session_duration) || 30
  const today = todayKey()

  // الأرقام الموجودة فعلاً عشان منضيفش المكرر
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

  // زيادة: فقط الأرقام من (القديم+1) للجديد اللي مش موجودة
  if (newLastSessionNum > oldLastSessionNum && effectiveTeacherId) {
    for (let n = oldLastSessionNum + 1; n <= newLastSessionNum; n++) {
      if (existingNums.has(n)) continue

      const offsetDays = n - oldLastSessionNum - 1
      const d = new Date(today + 'T12:00:00')
      d.setDate(d.getDate() - offsetDays)
      const sessionDate = d.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })

      const { error: insErr } = await sb.from('attendance').insert({
        student_id: studentId,
        teacher_id: effectiveTeacherId,
        session_date: sessionDate,
        status: 'حاضر',
        session_num: n,
        session_duration: duration,
        notes: `تعديل إداري — حصة رقم ${n} · ${before.name}`,
      })
      if (!insErr) {
        addedSessions.push(n)
        existingNums.add(n)
      }
    }
  }

  // تقليل: امسح اللي رقمها أكبر من الرقم الجديد
  if (newLastSessionNum < oldLastSessionNum) {
    const { data: extra } = await sb
      .from('attendance')
      .select('id, session_num, notes, session_date')
      .eq('student_id', studentId)
      .gt('session_num', newLastSessionNum)
      .limit(500)
    for (const row of extra ?? []) {
      await sb.from('activity_log').insert({
        actor_id: user.id,
        action: 'supervisor_reduce_session',
        entity_type: 'attendance',
        entity_id: row.id,
        details: {
          student_id: studentId,
          session_num: row.session_num,
          session_date: row.session_date,
          report: row.notes,
        },
      })
      const { error: delErr } = await sb.from('attendance').delete().eq('id', row.id)
      if (!delErr && row.session_num != null) removedSessions.push(Number(row.session_num))
    }

    // ظبّط تاريخ آخر حصة من المتبقي
    const { data: lastAtt } = await sb
      .from('attendance')
      .select('session_date')
      .eq('student_id', studentId)
      .in('status', ['حاضر', 'متأخر'])
      .order('session_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    await sb
      .from('students')
      .update({
        last_session_date: lastAtt?.session_date
          ? String(lastAtt.session_date).slice(0, 10)
          : null,
      })
      .eq('id', studentId)
  }

  await sb.from('activity_log').insert({
    actor_id: user.id,
    action: 'supervisor_edit_student',
    entity_type: 'student',
    entity_id: studentId,
    details: {
      name: payload.name,
      last_session_num: newLastSessionNum,
      old_last_session_num: oldLastSessionNum,
      stored_last: storedLast,
      max_attendance_num: maxAtt,
      added_session_nums: addedSessions,
      removed_session_nums: removedSessions,
    },
  })

  revalidateAll()

  let message = 'تم حفظ التعديلات بنجاح'
  if (addedSessions.length > 0) {
    message = `تم الحفظ · أُضيفت ${addedSessions.length} حصة ناقصة فقط (${addedSessions.join('، ')})`
  } else if (removedSessions.length > 0) {
    message = `تم الحفظ · اتشالت ${removedSessions.length} حصة زيادة من سجل المعلم`
  } else if (newLastSessionNum === oldLastSessionNum) {
    message = 'تم الحفظ · مفيش حصص اتضافت (الرقم زي ما هو)'
  }

  return {
    ok: true,
    addedSessions: addedSessions.length,
    removedSessions: removedSessions.length,
    oldLastSessionNum,
    newLastSessionNum,
    message,
  }
}
