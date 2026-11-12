'use server'

import { requireStaff } from '@/lib/auth-guards'
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

function isAdminFabricatedNote(notes: string | null | undefined): boolean {
  const t = String(notes || '')
  return (
    t.includes('تسوية إدارية') ||
    t.includes('تعديل إداري') ||
    t.includes('أُضيفت من لوحة') ||
    t.includes('مزامنة')
  )
}

/**
 * تعديل رقم آخر حصة:
 * المرجع = أعلى رقم في سجل المعلم (maxAtt) وليس العداد المتضخّم
 * زيادة عن maxAtt → أضف الناقص فقط بتاريخ أمس (مش النهارده)
 * تقليل → امسح الإداري فقط فوق الهدف
 */
export async function updateSessionNum(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }
  const __staff = await requireStaff()
  if (!__staff.ok) return { error: __staff.error }

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
  const { data: allAtt } = await sb
    .from('attendance')
    .select('id, session_num, session_date, notes, status')
    .eq('student_id', studentId)
    .limit(500)

  let maxAtt = 0
  const existingNums = new Set<number>()
  for (const row of allAtt || []) {
    const num = row.session_num != null ? Number(row.session_num) : NaN
    if (Number.isFinite(num) && num > 0) {
      existingNums.add(num)
      if (num > maxAtt) maxAtt = num
    }
  }

  const teacherId = before.teacher_id || null
  const lastSessionNum =
    rawLast === null || String(rawLast).trim() === ''
      ? Math.max(storedLast, maxAtt)
      : Math.max(0, Math.floor(Number(rawLast) || 0))

  // التسوية الإدارية: العدّاد المطلق مش مقيد بدورة الباقة
  if (!Number.isFinite(lastSessionNum) || lastSessionNum < 0) return { error: 'رقم الحصة غير صالح' }

  const addedSessions: number[] = []
  const removedSessions: number[] = []
  const removedReports: { session_num: number | null; session_date: string | null; notes: string | null }[] =
    []
  let keptReal = 0

  if (lastSessionNum > maxAtt && teacherId) {
    // لو التاريخ فاضي أو = النهارده → استخدم أمس عشان ما يتسجلش كتقرير نهارده في غرفة التسميع
    const todayCairo = todayKey()
    let settleDate = lastSessionDate || ''
    if (!settleDate || settleDate === todayCairo) {
      const [yy, mm, dd] = todayCairo.split('-').map(Number)
      const yest = new Date(Date.UTC(yy, mm - 1, dd))
      yest.setUTCDate(yest.getUTCDate() - 1)
      settleDate = yest.toISOString().slice(0, 10)
    }
    const duration = Number(before.session_duration) || 30
    for (let n = maxAtt + 1; n <= lastSessionNum; n++) {
      if (existingNums.has(n)) continue
      const { error: attErr } = await sb.from('attendance').insert({
        student_id: studentId,
        teacher_id: teacherId,
        session_date: settleDate,
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

  if (lastSessionNum < maxAtt) {
    for (const row of allAtt || []) {
      const num = row.session_num != null ? Number(row.session_num) : NaN
      if (!Number.isFinite(num) || num <= lastSessionNum) continue
      if (!isAdminFabricatedNote(row.notes)) {
        keptReal++
        continue
      }
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
  if (!resolvedDate && (removedSessions.length > 0 || addedSessions.length > 0)) {
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
  if (!resolvedDate && addedSessions.length > 0) {
    const [yy, mm, dd] = todayKey().split('-').map(Number)
    const yest = new Date(Date.UTC(yy, mm - 1, dd))
    yest.setUTCDate(yest.getUTCDate() - 1)
    resolvedDate = yest.toISOString().slice(0, 10)
  }

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
      stored_last: storedLast,
      max_attendance_num: maxAtt,
      added_session_nums: addedSessions,
      removed_session_nums: removedSessions,
      kept_real: keptReal,
      removed_reports: removedReports.slice(0, 20),
    },
  })

  revalidateAll()

  let message = `تم ضبط العداد على ${lastSessionNum} — التالي ${lastSessionNum + 1}`
  if (addedSessions.length > 0) {
    message = `تم · أُضيفت ${addedSessions.length} حصة لسجل المعلم (${addedSessions.join('، ')}) · التالي ${lastSessionNum + 1}`
  }
  if (removedSessions.length > 0) {
    message += ` · اتشالت ${removedSessions.length} إدارية زيادة`
  }
  if (keptReal > 0) {
    message += ` · اتفادت ${keptReal} حصة حقيقية للمعلم`
  }

  return {
    ok: true,
    addedSessions: addedSessions.length,
    removedSessions: removedSessions.length,
    message,
  }
}
