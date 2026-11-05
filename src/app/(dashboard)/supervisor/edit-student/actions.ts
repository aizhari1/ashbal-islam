'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function supervisorEditStudent(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const studentId = String(formData.get('student_id') || '')
  if (!studentId) return { error: 'اختر طالب' }

  const payload: Record<string, unknown> = {
    name: String(formData.get('name') || '').trim() || undefined,
    phone: String(formData.get('phone') || '') || null,
    monthly_sessions: Number(formData.get('monthly_sessions') || 0) || null,
    session_duration: Number(formData.get('session_duration') || 30) || 30,
    last_session_num: Number(formData.get('last_session_num') || 0),
    amount_due: Number(formData.get('amount_due') || 0),
    price_per_session: Number(formData.get('price_per_session') || 25),
    teacher_id: String(formData.get('teacher_id') || '') || null,
  }

  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

  const { error } = await supabase.from('students').update(payload).eq('id', studentId)
  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    action: 'student_update',
    entity_id: studentId,
    actor_id: user.id,
    details: payload,
  })

  revalidatePath('/supervisor/edit-student')
  revalidatePath('/admin/students')
  return { ok: true }
}
