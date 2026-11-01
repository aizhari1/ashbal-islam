'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTrial(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const name = String(formData.get('name') || '').trim()
  const teacherId = String(formData.get('teacher_id') || '') || null
  const phone = String(formData.get('phone') || '') || null
  const notes = String(formData.get('notes') || '') || null
  const trialDate = String(formData.get('trial_date') || '') || null

  if (!name) return { error: 'اسم الطالب مطلوب' }

  const code = `TR-${Date.now().toString().slice(-6)}`

  const { data, error } = await supabase
    .from('students')
    .insert({
      code,
      name,
      teacher_id: teacherId,
      phone,
      status: 'تجريبي',
      subscription_type: 'تجريبي',
      monthly_sessions: 1,
      session_duration: 30,
      price_per_session: 0,
      amount_due: 0,
      notes: notes ? `تجريبي${trialDate ? ' · ' + trialDate : ''} · ${notes}` : `تجريبي${trialDate ? ' · ' + trialDate : ''}`,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    action: 'trial_add',
    entity_id: data?.id,
    user_id: user.id,
    details: { name, code, teacher_id: teacherId, trial_date: trialDate },
  })

  revalidatePath('/admin/trials')
  return { ok: true }
}
