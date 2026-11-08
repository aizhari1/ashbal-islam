'use server'

import { currentMonthKey } from '@/lib/dues'
import { requireAdmin } from '@/lib/courses'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function revalidateTeacherPaths() {
  for (const p of [
    '/admin/users',
    '/admin/payroll',
    '/admin/session-settle',
    '/teacher',
    '/teacher/students',
    '/teacher/attendance',
    '/teacher/dues',
    '/supervisor/edit-student',
  ]) {
    revalidatePath(p)
  }
}

export async function addUser(formData: FormData) {
  const __auth = await requireAdmin()
  if (!__auth.ok) return { error: __auth.error || 'للإدارة فقط' }
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
    const { data: existing } = await admin
      .from('teachers')
      .select('id, code, name, profile_id')
      .or(`code.eq.${tcode},name.eq.${fullName}`)
      .limit(5)

    const orphan = (existing || []).find((t) => !t.profile_id)
    if (orphan) {
      await admin
        .from('teachers')
        .update({ profile_id: created.user!.id, is_active: true, name: fullName })
        .eq('id', orphan.id)
    } else {
      await admin.from('teachers').upsert(
        {
          code: tcode,
          name: fullName,
          profile_id: created.user!.id,
          rate_percent: 50,
          is_active: true,
        },
        { onConflict: 'code' }
      )
    }
  }

  revalidateTeacherPaths()
  return { success: true }
}

export async function setUserRole(formData: FormData) {
  const __auth = await requireAdmin()
  if (!__auth.ok) return { error: __auth.error || 'للإدارة فقط' }
  const id = String(formData.get('id') || '')
  const role = String(formData.get('role') || '')
  if (!id || !role) return { error: 'بيانات ناقصة' }
  const admin = service()
  const { error } = await admin.from('profiles').update({ role }).eq('id', id)
  if (error) return { error: error.message }

  if (role === 'teacher') {
    const { data: prof } = await admin.from('profiles').select('id, code, full_name').eq('id', id).maybeSingle()
    if (prof) {
      const { data: linked } = await admin.from('teachers').select('id').eq('profile_id', id).maybeSingle()
      if (!linked) {
        const tcode = (prof.code || '').startsWith('T-') ? prof.code : `T-${prof.code || id.slice(0, 6)}`
        const { data: byCode } = await admin.from('teachers').select('id, profile_id').eq('code', tcode).maybeSingle()
        if (byCode && !byCode.profile_id) {
          await admin.from('teachers').update({ profile_id: id, is_active: true, name: prof.full_name }).eq('id', byCode.id)
        } else if (!byCode) {
          const { data: byName } = await admin
            .from('teachers')
            .select('id, profile_id')
            .eq('name', prof.full_name)
            .is('profile_id', null)
            .limit(1)
            .maybeSingle()
          if (byName) {
            await admin.from('teachers').update({ profile_id: id, is_active: true }).eq('id', byName.id)
          } else {
            await admin.from('teachers').insert({
              code: tcode,
              name: prof.full_name || tcode,
              profile_id: id,
              rate_percent: 50,
              is_active: true,
            })
          }
        }
      }
    }
  }

  revalidateTeacherPaths()
  return { success: true }
}

export async function deactivateUser(formData: FormData) {
  const __auth = await requireAdmin()
  if (!__auth.ok) return { error: __auth.error || 'للإدارة فقط' }
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'معرّف ناقص' }
  const admin = service()
  const { error } = await admin.from('profiles').update({ is_active: false }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { success: true }
}

export async function activateUser(formData: FormData) {
  const __auth = await requireAdmin()
  if (!__auth.ok) return { error: __auth.error || 'للإدارة فقط' }
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'معرّف ناقص' }
  const admin = service()
  const { error } = await admin.from('profiles').update({ is_active: true }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { success: true }
}

/** ربط صف معلم موجود بحساب مستخدم (profile) */
export async function linkTeacherProfile(formData: FormData) {
  const __auth = await requireAdmin()
  if (!__auth.ok) return { error: __auth.error || 'للإدارة فقط' }
  const teacherId = String(formData.get('teacher_id') || '').trim()
  const profileId = String(formData.get('profile_id') || '').trim()
  if (!teacherId || !profileId) return { error: 'اختر المعلم والحساب' }

  const admin = service()

  await admin.from('teachers').update({ profile_id: null }).eq('profile_id', profileId)

  const { error } = await admin
    .from('teachers')
    .update({ profile_id: profileId, is_active: true })
    .eq('id', teacherId)
  if (error) return { error: error.message }

  await admin.from('profiles').update({ role: 'teacher', is_active: true }).eq('id', profileId)

  revalidateTeacherPaths()
  return { success: true, message: 'تم ربط الحساب بملف المعلم وتفعيله' }
}

/** تفعيل/تعطيل صف المعلم في جدول teachers */
export async function setTeacherActive(formData: FormData) {
  const __auth = await requireAdmin()
  if (!__auth.ok) return { error: __auth.error || 'للإدارة فقط' }
  const teacherId = String(formData.get('teacher_id') || '').trim()
  const active = String(formData.get('is_active') || '') === 'true'
  if (!teacherId) return { error: 'معرّف ناقص' }
  const admin = service()
  const { error } = await admin.from('teachers').update({ is_active: active }).eq('id', teacherId)
  if (error) return { error: error.message }
  revalidateTeacherPaths()
  return { success: true, message: active ? 'تم تفعيل المعلم' : 'تم إيقاف المعلم' }
}

/** إصلاح تلقائي: اربط كل حساب role=teacher بصف teachers بالاسم أو الكود */
export async function autoLinkOrphanTeachers() {
  const __auth = await requireAdmin()
  if (!__auth.ok) return { error: __auth.error || 'للإدارة فقط' }
  const admin = service()

  const { data: teacherProfiles } = await admin
    .from('profiles')
    .select('id, code, full_name')
    .eq('role', 'teacher')

  const { data: teachers } = await admin.from('teachers').select('id, code, name, profile_id, is_active')

  let linked = 0
  let created = 0
  let activated = 0

  const byProfile = new Set((teachers || []).filter((t) => t.profile_id).map((t) => t.profile_id))

  for (const p of teacherProfiles || []) {
    if (byProfile.has(p.id)) {
      const row = (teachers || []).find((t) => t.profile_id === p.id)
      if (row && row.is_active === false) {
        await admin.from('teachers').update({ is_active: true }).eq('id', row.id)
        activated++
      }
      continue
    }

    const code = (p.code || '').toUpperCase()
    const tcode = code.startsWith('T-') ? code : code ? `T-${code}` : null
    const name = (p.full_name || '').trim()

    let match =
      (teachers || []).find((t) => !t.profile_id && tcode && t.code === tcode) ||
      (teachers || []).find((t) => !t.profile_id && name && t.name === name) ||
      null

    if (!match && name) {
      const parts = name.split(/\s+/).filter(Boolean)
      if (parts.length >= 2) {
        const key = parts.slice(0, 2).join(' ')
        match =
          (teachers || []).find((t) => !t.profile_id && String(t.name || '').includes(key)) || null
      }
    }

    if (match) {
      await admin.from('teachers').update({ profile_id: p.id, is_active: true }).eq('id', match.id)
      linked++
      byProfile.add(p.id)
    } else {
      const newCode = tcode || `T-${p.id.slice(0, 6).toUpperCase()}`
      const { error } = await admin.from('teachers').insert({
        code: newCode,
        name: name || newCode,
        profile_id: p.id,
        rate_percent: 50,
        is_active: true,
      })
      if (!error) {
        created++
        byProfile.add(p.id)
      }
    }
  }

  revalidateTeacherPaths()
  return {
    success: true,
    message: `تم: ربط ${linked} · إنشاء ${created} · تفعيل ${activated}`,
    linked,
    created,
    activated,
  }
}

export async function setTeacherSessionRate(formData: FormData) {
  const __auth = await requireAdmin()
  if (!__auth.ok) return { error: __auth.error || 'للإدارة فقط' }
  const teacherId = String(formData.get('teacher_id') || '')
  const teacherName = String(formData.get('teacher_name') || '')
  const rate = Number(formData.get('session_rate') || 0)
  if (!teacherId || rate <= 0) return { error: 'بيانات غير صحيحة' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
  const __auth = await requireAdmin()
  if (!__auth.ok) return { error: __auth.error || 'للإدارة فقط' }
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
  const __auth = await requireAdmin()
  if (!__auth.ok) return { error: __auth.error || 'للإدارة فقط' }
  const teacherName = String(formData.get('teacher_name') || '')
  const amount = Number(formData.get('amount') || 0)
  const note = String(formData.get('note') || '')
  if (!teacherName || amount <= 0) return { error: 'بيانات غير صحيحة' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  await supabase.from('activity_log').insert({
    actor_id: user?.id,
    action: 'teacher_settlement',
    entity_type: 'teacher',
    details: { teacher_name: teacherName, amount, note, month: currentMonthKey() },
  })
  await supabase.from('activity_log').insert({
    actor_id: user?.id,
    action: 'finance_expense',
    entity_type: 'finance',
    details: {
      amount,
      category: 'مرتبات',
      description: `تسوية راتب ${teacherName}${note ? ' — ' + note : ''}`,
    },
  })
  revalidatePath('/admin/payroll')
  revalidatePath('/admin/cashbox')
  return { success: true }
}
