'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markReminded(formData: FormData) {
  const studentId = String(formData.get('student_id') || '')
  const studentName = String(formData.get('student_name') || '')
  const code = String(formData.get('code') || '')
  if (!studentId) return { error: 'معرّف ناقص' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('activity_log').insert({
    actor_id: user?.id,
    action: 'payment_reminder',
    entity_type: 'student',
    entity_id: studentId,
    details: {
      code,
      student_name: studentName,
      status: 'تم التذكير',
      at: new Date().toISOString(),
    },
  })
  revalidatePath('/admin/finance')
  return { success: true }
}

export async function saveContactStatus(formData: FormData) {
  const studentId = String(formData.get('student_id') || '')
  const code = String(formData.get('code') || '')
  const studentName = String(formData.get('student_name') || '')
  const status = String(formData.get('status') || '')
  if (!studentId || !status) return { error: 'بيانات ناقصة' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle()

  await supabase.from('activity_log').insert({
    actor_id: user?.id,
    action: 'contact_status',
    entity_type: 'student',
    entity_id: studentId,
    details: {
      code,
      student_name: studentName,
      status,
      actor: profile?.full_name || '',
      at: new Date().toISOString(),
    },
  })
  revalidatePath('/admin/finance')
  return { success: true }
}
