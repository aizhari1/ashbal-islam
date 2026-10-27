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
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const today = new Date().toISOString().slice(0, 10)

  const { data: row, error } = await supabase
    .from('attendance')
    .insert({
      student_id: data.student_id,
      teacher_id: data.teacher_id || null,
      session_date: today,
      status: data.status,
      hifz_from: data.hifz_from || null,
      hifz_to: data.hifz_to || null,
      muraja_from: data.muraja_from || null,
      muraja_to: data.muraja_to || null,
      tajweed_notes: data.tajweed_notes || null,
      rating: data.rating || null,
      notes: data.notes || null,
      session_num: data.session_num || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  const { data: student } = await supabase
    .from('students')
    .select('last_session_num, monthly_sessions')
    .eq('id', data.student_id)
    .single()

  if (student && data.status === 'حاضر') {
    await supabase.from('students').update({
      last_session_date: today,
      last_session_num: (student.last_session_num || 0) + 1,
      monthly_sessions: (student.monthly_sessions || 0) + 1,
    }).eq('id', data.student_id)
  }

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'log_attendance',
    entity_type: 'attendance',
    entity_id: row.id,
    details: { student_id: data.student_id, status: data.status },
  })

  revalidatePath('/teacher')
  revalidatePath('/teacher/session')
  revalidatePath('/admin/students')
  return { success: true, data: row }
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
