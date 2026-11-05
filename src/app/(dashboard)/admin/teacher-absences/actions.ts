'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function logTeacherAbsence(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const teacherId = String(formData.get('teacher_id') || '')
  const absenceDate = String(formData.get('absence_date') || '')
  const reason = String(formData.get('reason') || '') || null

  if (!teacherId || !absenceDate) return { error: 'بيانات ناقصة' }

  const { data: teacher } = await supabase.from('teachers').select('name').eq('id', teacherId).single()

  await supabase.from('activity_log').insert({
    action: 'teacher_absence',
    entity_id: teacherId,
    actor_id: user.id,
    details: {
      teacher_name: teacher?.name,
      absence_date: absenceDate,
      reason,
    },
  })

  revalidatePath('/admin/teacher-absences')
  return { ok: true }
}
