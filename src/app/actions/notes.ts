'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addNote(formData: FormData) {
  const body = String(formData.get('body') || '').trim()
  if (!body) return { error: 'اكتب الملاحظة' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const { data: profile } = await supabase.from('profiles').select('full_name, role, code').eq('id', user.id).single()

  const target = String(formData.get('target') || 'admin')
  const teacherId = String(formData.get('teacher_id') || '') || null

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'note',
    entity_type: teacherId ? 'teacher' : 'admin',
    entity_id: teacherId || user.id,
    details: {
      body,
      target,
      from_name: profile?.full_name || '',
      from_role: profile?.role || '',
      from_code: profile?.code || '',
      at: new Date().toISOString(),
    },
  })

  revalidatePath('/admin/notes')
  revalidatePath('/admin/chat')
  revalidatePath('/teacher')
  revalidatePath('/supervisor')
  return { success: true }
}

export async function sendChatMessage(formData: FormData) {
  const body = String(formData.get('body') || '').trim()
  const peerId = String(formData.get('peer_id') || '').trim()
  if (!body) return { error: 'اكتب رسالة' }
  if (!peerId) return { error: 'اختر الطرف' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const { data: profile } = await supabase.from('profiles').select('full_name, role, code').eq('id', user.id).single()

  const a = user.id
  const b = peerId
  const thread = [a, b].sort().join(':')

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'chat_message',
    entity_type: 'chat',
    entity_id: thread,
    details: {
      body,
      from_id: user.id,
      to_id: peerId,
      from_name: profile?.full_name || '',
      from_role: profile?.role || '',
      thread,
      at: new Date().toISOString(),
    },
  })

  revalidatePath('/admin/chat')
  revalidatePath('/teacher/chat')
  return { success: true }
}
