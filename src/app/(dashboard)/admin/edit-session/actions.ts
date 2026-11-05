'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateSessionNum(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const studentId = String(formData.get('student_id') || '')
  const lastSessionNum = Number(formData.get('last_session_num') || 0)
  const lastSessionDate = String(formData.get('last_session_date') || '') || null

  if (!studentId) return { error: 'اختر طالب' }

  const { error } = await supabase
    .from('students')
    .update({
      last_session_num: lastSessionNum,
      last_session_date: lastSessionDate,
    })
    .eq('id', studentId)

  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    action: 'session_num',
    entity_id: studentId,
    actor_id: user.id,
    details: { last_session_num: lastSessionNum, last_session_date: lastSessionDate },
  })

  revalidatePath('/admin/edit-session')
  revalidatePath('/admin/students')
  return { ok: true }
}
