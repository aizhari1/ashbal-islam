'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addFixedSchedule(formData: FormData) {
  const supabase = await createClient()
  const student_id = String(formData.get('student_id') || '') || null
  const teacher_id = String(formData.get('teacher_id') || '') || null
  const day_of_week = Number(formData.get('day_of_week') || 0)
  const start_time = String(formData.get('start_time') || '') || null
  const duration_minutes = Number(formData.get('duration_minutes') || 30)
  const zoom = String(formData.get('zoom_link') || '').trim()
  const notesBase = String(formData.get('notes') || '').trim()
  const notes = zoom ? `${notesBase}${notesBase ? ' | ' : ''}ZOOM=${zoom}` : notesBase || null

  if (day_of_week < 0 || day_of_week > 6) {
    return { error: 'اختر يوم الأسبوع' }
  }

  const { error } = await supabase.from('schedule_entries').insert({
    student_id,
    teacher_id,
    day_of_week,
    start_time,
    duration_minutes,
    status: 'مجدول',
    notes,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/fixed-schedule')
  return { success: true }
}

export async function deleteFixedSchedule(formData: FormData) {
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'معرّف ناقص' }
  const supabase = await createClient()
  const { error } = await supabase.from('schedule_entries').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/fixed-schedule')
  return { success: true }
}

export async function addSupervisorEval(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const teacher_id = String(formData.get('teacher_id') || '')
  const teacher_name = String(formData.get('teacher_name') || '')
  const points = Number(formData.get('points') || 0)
  const notes = String(formData.get('notes') || '')
  if (!teacher_id) return { error: 'اختر معلماً' }

  const { error } = await supabase.from('activity_log').insert({
    actor_id: user?.id,
    action: 'supervisor_eval',
    entity_type: 'teacher',
    entity_id: teacher_id,
    details: {
      teacher_name,
      points,
      notes,
      month: 'أكتوبر 2026',
    },
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/supervisor-eval')
  return { success: true }
}
