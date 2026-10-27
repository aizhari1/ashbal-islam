'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addStudent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const name = String(formData.get('name') || '').trim()
  if (!name) return { error: 'الاسم مطلوب' }

  const { data: last } = await supabase.from('students').select('code').order('code', { ascending: false }).limit(1)
  let nextNum = 1
  if (last?.[0]?.code) {
    const m = String(last[0].code).match(/(\d+)/)
    if (m) nextNum = parseInt(m[1], 10) + 1
  }
  const code = `ST-${String(nextNum).padStart(4, '0')}`

  const { data, error } = await supabase.from('students').insert({
    code,
    name,
    teacher_id: formData.get('teacher_id') || null,
    phone: formData.get('phone') || null,
    email: formData.get('email') || null,
    age: formData.get('age') ? Number(formData.get('age')) : null,
    country: formData.get('country') || null,
    subscription_type: formData.get('subscription_type') || 'شهري',
    session_duration: formData.get('session_duration') ? Number(formData.get('session_duration')) : 30,
    price_per_session: formData.get('price_per_session') ? Number(formData.get('price_per_session')) : 60,
    currency: formData.get('currency') || 'EGP',
    status: formData.get('status') || 'نشط',
    monthly_sessions: formData.get('monthly_sessions') ? Number(formData.get('monthly_sessions')) : 4,
  }).select().single()

  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    actor_id: user.id, action: 'add_student', entity_type: 'student', entity_id: data.id, details: { name, code },
  })

  revalidatePath('/admin/students')
  return { success: true, data }
}

export async function updateStudentStatus(studentId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const { error } = await supabase.from('students').update({ status }).eq('id', studentId)
  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    actor_id: user.id, action: 'change_status', entity_type: 'student', entity_id: studentId, details: { status },
  })

  revalidatePath('/admin/students')
  revalidatePath(`/admin/students/${studentId}`)
  return { success: true }
}

export async function transferStudent(studentId: string, teacherId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const { error } = await supabase.from('students').update({ teacher_id: teacherId || null }).eq('id', studentId)
  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    actor_id: user.id, action: 'transfer_student', entity_type: 'student', entity_id: studentId, details: { teacher_id: teacherId },
  })

  revalidatePath('/admin/students')
  revalidatePath(`/admin/students/${studentId}`)
  return { success: true }
}

export async function updateStudent(studentId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const patch: Record<string, unknown> = {}
  for (const key of ['name', 'phone', 'email', 'country', 'subscription_type', 'currency', 'status']) {
    const v = formData.get(key)
    if (v !== null && v !== undefined && String(v) !== '') patch[key] = String(v)
  }
  for (const key of ['age', 'session_duration', 'price_per_session', 'monthly_sessions', 'amount_due']) {
    const v = formData.get(key)
    if (v !== null && String(v) !== '') patch[key] = Number(v)
  }
  if (formData.get('teacher_id')) patch.teacher_id = formData.get('teacher_id')

  const { error } = await supabase.from('students').update(patch).eq('id', studentId)
  if (error) return { error: error.message }

  revalidatePath('/admin/students')
  revalidatePath(`/admin/students/${studentId}`)
  return { success: true }
}
