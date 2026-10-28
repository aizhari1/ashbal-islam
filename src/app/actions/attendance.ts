'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const today = new Date().toISOString().slice(0, 10)

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
        teacher_id: data.teacher_id || null,
      })
      .eq('id', existing[0].id)
      .select()
      .single()
    if (error) return { error: error.message }

    await supabase.from('activity_log').insert({
      actor_id: user.id,
      action: 'session_report',
      entity_type: 'student',
      entity_id: data.student_id,
      details: {
        attendance_id: row.id,
        status: data.status,
        report: data.report_text || '',
        score_new: data.score_new,
        score_recent: data.score_recent,
        score_far: data.score_far,
        updated: true,
        date: today,
      },
    })

    revalidatePath('/teacher')
    revalidatePath('/teacher/session')
    revalidatePath('/teacher/attendance')
    return { success: true, data: row, message: 'اتحدّث تقرير اليوم' }
  }

  const { data: student } = await supabase
    .from('students')
    .select('last_session_num, monthly_sessions, subscription_type')
    .eq('id', data.student_id)
    .single()

  let nextSession = (student?.last_session_num || 0) + 1
  const quotaMatch = String(student?.subscription_type || student?.monthly_sessions || '').match(/(\d+)/)
  const quota = quotaMatch ? parseInt(quotaMatch[1], 10) : Number(student?.monthly_sessions) || 0
  if (quota > 0 && nextSession > quota) nextSession = 1

  const isPresent = data.status === 'حاضر' || data.status === 'متأخر' || data.status === 'تم الحضور'

  const { data: row, error } = await supabase
    .from('attendance')
    .insert({
      student_id: data.student_id,
      teacher_id: data.teacher_id || null,
      session_date: today,
      status: data.status === 'تم الحضور' ? 'حاضر' : data.status === 'لم يحضر' ? 'غائب' : data.status,
      hifz_from: data.hifz_from || null,
      hifz_to: data.hifz_to || null,
      muraja_from: data.muraja_from || null,
      muraja_to: data.muraja_to || null,
      tajweed_notes: data.tajweed_notes || null,
      rating: data.rating || null,
      notes: data.report_text || data.notes || null,
      session_num: isPresent ? nextSession : data.session_num || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  if (student && isPresent) {
    await supabase.from('students').update({
      last_session_date: today,
      last_session_num: nextSession,
    }).eq('id', data.student_id)
  }

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'session_report',
    entity_type: 'student',
    entity_id: data.student_id,
    details: {
      attendance_id: row.id,
      status: data.status,
      report: data.report_text || '',
      score_new: data.score_new,
      score_recent: data.score_recent,
      score_far: data.score_far,
      session_num: nextSession,
      date: today,
    },
  })

  revalidatePath('/teacher')
  revalidatePath('/teacher/session')
  revalidatePath('/teacher/attendance')
  revalidatePath('/admin/students')
  return { success: true, data: row, message: isPresent ? `اتسجل حضور — حصة رقم ${nextSession}` : 'اتسجل الغياب مع التقرير' }
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
