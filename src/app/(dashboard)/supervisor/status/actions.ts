'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function changeStudentStatus(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const studentId = String(formData.get('student_id') || '')
  const status = String(formData.get('status') || '')
  const note = String(formData.get('note') || '') || null

  if (!studentId || !status) return { error: 'بيانات ناقصة' }

  const { error } = await supabase.from('students').update({ status, notes: note }).eq('id', studentId)
  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    action: 'student_status',
    entity_id: studentId,
    actor_id: user.id,
    details: { status, note },
  })

  revalidatePath('/supervisor/status')
  revalidatePath('/supervisor')
  revalidatePath('/admin/students')
  return { ok: true }
}
