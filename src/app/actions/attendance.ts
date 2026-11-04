'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { dueAfterPackageComplete, packageSize, todayKey } from '@/lib/dues'

export async function recordAttendance(data: {
  student_id: string
  teacher_id?: string | null
  status: string
  hifz_from?: string
  hifz_to?: string
  muraja_from?: string
  muraja_to?: string
  tajweed_notes?: string
  rating?: number
  notes?: string
  session_num?: number
  report_text?: string
  score_new?: number | null
  score_recent?: number | null
  score_far?: number | null
  session_duration?: number | null
  new_memorization?: string | null
  recent_past?: string | null
  far_past?: string | null
  arabic_lang?: string | null
  tarbiya_note?: string | null
  sharii_note?: string | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const today = todayKey()

  // المعلم: اللي سجّل الحصة (حسابه) ثم معلم الطالب — عشان الحصة ما تتسجلش من غير معلم وتضيع من الرواتب
  let teacherId: string | null = data.teacher_id || null
  if (!teacherId) {
    const { data: t } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()
    teacherId = t?.id || null
  }
  if (!teacherId) {
    const { data: st0 } = await supabase.from('students').select('teacher_id').eq('id', data.student_id).maybeSingle()
    teacherId = st0?.teacher_id || null
  }

  const score = (v: unknown) => {
    if (v === null || v === undefined || v === '') return null
    const n = Math.round(Number(v))
    return Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : null
  }
  const txt = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 1000) : null)
  const dur = Number(data.session_duration)
  const details = {
    session_duration: Number.isFinite(dur) && dur >= 5 && dur <= 300 ? Math.round(dur) : null,
    score_new: score(data.score_new),
    score_recent: score(data.score_recent),
    score_far: score(data.score_far),
    new_memorization: txt(data.new_memorization),
    recent_past: txt(data.recent_past),
    far_past: txt(data.far_past),
    arabic_lang: txt(data.arabic_lang),
    tarbiya_note: txt(data.tarbiya_note),
    sharii_note: txt(data.sharii_note),
  }

  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('student_id', data.student_id)
    .eq('session_date', today)
    .limit(1)

  if (existing && existing.length > 0) {
    const { data: row, error } = await supabase
      .from('attendance')
      .update({
        status: data.status,
        hifz_from: data.hifz_from || null,
        hifz_to: data.hifz_to || null,
        muraja_from: data.muraja_from || null,
        muraja_to: data.muraja_to || null,
        tajweed_notes: data.tajweed_notes || null,
        rating: data.rating || null,
        notes: data.report_text || data.notes || null,
        teacher_id: teacherId,
        ...details,
      })
      .eq('id', existing[0].id)
      .select()
      .single()
    if (error) return { error: error.message }

    revalidatePath('/teacher')
    revalidatePath('/teacher/session')
    return { success: true, data: row, message: 'اتحدّث تقرير اليوم' }
  }

  const { data: student } = await supabase
    .from('students')
    .select('last_session_num, monthly_sessions, subscription_type, price_per_session, amount_due')
    .eq('id', data.student_id)
    .single()

  const quota = packageSize(student || {})
  const prevNum = student?.last_session_num || 0
  let nextSession = prevNum + 1
  const completedPackage = quota > 0 && nextSession >= quota
  if (quota > 0 && nextSession > quota) nextSession = 1

  const isPresent =
    data.status === 'حاضر' || data.status === 'متأخر' || data.status === 'تم الحضور'

  const { data: row, error } = await supabase
    .from('attendance')
    .insert({
      student_id: data.student_id,
      teacher_id: teacherId,
      session_date: today,
      status:
        data.status === 'تم الحضور'
          ? 'حاضر'
          : data.status === 'لم يحضر'
            ? 'غائب'
            : data.status,
      hifz_from: data.hifz_from || null,
      hifz_to: data.hifz_to || null,
      muraja_from: data.muraja_from || null,
      muraja_to: data.muraja_to || null,
      tajweed_notes: data.tajweed_notes || null,
      rating: data.rating || null,
      notes: data.report_text || data.notes || null,
      session_num: isPresent ? nextSession : data.session_num || null,
      ...details,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  let dueMsg = ''
  if (student && isPresent) {
    const patch: Record<string, unknown> = {
      last_session_date: today,
      last_session_num: nextSession,
    }
    if (completedPackage) {
      const due = dueAfterPackageComplete(student)
      if (due > 0) {
        patch.amount_due = due
        dueMsg = ` · مستحق ${due} ج`
      }
    }
    await supabase.from('students').update(patch).eq('id', data.student_id)
  }

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'session_report',
    entity_type: 'student',
    entity_id: data.student_id,
    details: {
      attendance_id: row.id,
      status: data.status,
      session_num: nextSession,
      date: today,
      package_complete: completedPackage,
    },
  })

  revalidatePath('/teacher')
  revalidatePath('/teacher/session')
  revalidatePath('/teacher/attendance')
  revalidatePath('/admin/students')
  revalidatePath('/admin/finance')
  revalidatePath('/supervisor')
  return {
    success: true,
    data: row,
    message: isPresent
      ? `اتسجل حضور — حصة رقم ${nextSession}${dueMsg}`
      : 'اتسجل الغياب مع التقرير',
  }
}

export async function bulkAttendance(
  items: { student_id: string; status: string; teacher_id?: string | null }[]
) {
  const results = []
  for (const item of items) {
    results.push(await recordAttendance(item))
  }
  return results
}
