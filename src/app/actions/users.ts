'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function addUser(formData: FormData) {
  const code = String(formData.get('code') || '').trim().toUpperCase()
  const fullName = String(formData.get('full_name') || '').trim()
  const password = String(formData.get('password') || '').trim()
  const role = String(formData.get('role') || 'teacher').trim()
  if (!code || !fullName || !password) return { error: 'الكود والاسم وكلمة المرور مطلوبة' }
  if (password.length < 6) return { error: 'كلمة المرور 6 أحرف على الأقل' }

  const admin = service()
  const email = `${code}@ashbal.local`
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { code, full_name: fullName, role },
  })
  if (authErr) return { error: authErr.message }

  const { error: profErr } = await admin.from('profiles').upsert({
    id: created.user!.id,
    code,
    full_name: fullName,
    role,
    email,
    is_active: true,
  })
  if (profErr) return { error: profErr.message }

  if (role === 'teacher') {
    const tcode = code.startsWith('T-') ? code : `T-${code}`
    await admin.from('teachers').upsert({
      code: tcode,
      name: fullName,
      profile_id: created.user!.id,
      rate_percent: 50,
      is_active: true,
    }, { onConflict: 'code' })
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function setUserRole(formData: FormData) {
  const id = String(formData.get('id') || '')
  const role = String(formData.get('role') || '')
  if (!id || !role) return { error: 'بيانات ناقصة' }
  const admin = service()
  const { error } = await admin.from('profiles').update({ role }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { success: true }
}

export async function deactivateUser(formData: FormData) {
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'معرّف ناقص' }
  const admin = service()
  const { error } = await admin.from('profiles').update({ is_active: false }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { success: true }
}

export async function activateUser(formData: FormData) {
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'معرّف ناقص' }
  const admin = service()
  const { error } = await admin.from('profiles').update({ is_active: true }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { success: true }
}

export async function setTeacherSessionRate(formData: FormData) {
  const teacherId = String(formData.get('teacher_id') || '')
  const teacherName = String(formData.get('teacher_name') || '')
  const rate = Number(formData.get('session_rate') || 0)
  if (!teacherId || rate <= 0) return { error: 'بيانات غير صحيحة' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('activity_log').delete().eq('action', 'teacher_session_rate').eq('entity_id', teacherId)
  const { error } = await supabase.from('activity_log').insert({
    actor_id: user?.id,
    action: 'teacher_session_rate',
    entity_type: 'teacher',
    entity_id: teacherId,
    details: { teacher_name: teacherName, session_rate: rate },
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/payroll')
  return { success: true }
}

export async function setTeacherAcademyRate(formData: FormData) {
  const teacherId = String(formData.get('teacher_id') || '')
  const rate = Number(formData.get('rate_percent') || 0)
  if (!teacherId) return { error: 'معرّف ناقص' }
  const admin = service()
  const { error } = await admin.from('teachers').update({ rate_percent: rate }).eq('id', teacherId)
  if (error) return { error: error.message }
  revalidatePath('/admin/payroll')
  return { success: true }
}

export async function recordTeacherSettlement(formData: FormData) {
  const teacherName = String(formData.get('teacher_name') || '')
  const amount = Number(formData.get('amount') || 0)
  const note = String(formData.get('note') || '')
  if (!teacherName || amount <= 0) return { error: 'بيانات غير صحيحة' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('activity_log').insert({
    actor_id: user?.id,
    action: 'teacher_settlement',
    entity_type: 'teacher',
    details: { teacher_name: teacherName, amount, note, month: '2026-10' },
  })
  await supabase.from('activity_log').insert({
    actor_id: user?.id,
    action: 'finance_expense',
    entity_type: 'finance',
    details: { amount, category: 'مرتبات', description: `تسوية راتب ${teacherName}${note ? ' — ' + note : ''}` },
  })
  revalidatePath('/admin/payroll')
  revalidatePath('/admin/cashbox')
  return { success: true }
}
