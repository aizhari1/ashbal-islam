import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY غير مضبوط')
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export type TeacherRow = {
  id: string
  code: string | null
  name: string | null
  profile_id: string | null
  is_active: boolean | null
  rate_percent?: number | null
}

/**
 * يجيب صف المعلم المرتبط بالحساب.
 * لو مش موجود: يحاول الربط بالاسم/الكود من profiles، أو ينشئ صف جديد (للمعلمين فقط).
 * حسابات الإدارة/الإشراف: متتعملش ملف معلم فاضي.
 */
export async function resolveTeacherForUser(
  _supabase: SupabaseClient,
  userId: string
): Promise<{ teacher: TeacherRow | null; linked: boolean; created: boolean; message?: string; role?: string }> {
  const sb = service()

  const { data: profile } = await sb
    .from('profiles')
    .select('id, code, full_name, role')
    .eq('id', userId)
    .maybeSingle()

  const role = String(profile?.role || '')

  const { data: already } = await sb
    .from('teachers')
    .select('id, code, name, profile_id, is_active, rate_percent')
    .eq('profile_id', userId)
    .maybeSingle()

  if (already) {
    if (already.is_active === false) {
      await sb.from('teachers').update({ is_active: true }).eq('id', already.id)
      already.is_active = true
    }
    // لو أدمن مربوط بملف معلم فاضي (زي المدير العام) — متخليهوش يبان كمعلم بـ 0 طلاب بدون توضيح
    if (role === 'admin' || role === 'supervisor') {
      const { count } = await sb
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', already.id)
      if (!count) {
        return {
          teacher: already as TeacherRow,
          linked: false,
          created: false,
          role,
          message:
            'أنت داخل بحساب الإدارة/الإشراف. للتسميع والطلاب سجّل دخول بحساب المعلم (مثل مصطفى منيع).',
        }
      }
    }
    return { teacher: already as TeacherRow, linked: false, created: false, role }
  }

  if (!profile) {
    return { teacher: null, linked: false, created: false, message: 'حساب بدون ملف profiles', role }
  }

  // ممنوع إنشاء/ربط معلم تلقائي لحساب أدمن أو مشرف
  if (role === 'admin' || role === 'supervisor') {
    return {
      teacher: null,
      linked: false,
      created: false,
      role,
      message: 'حساب إدارة — سجّل بحساب المعلم لفتح غرفة التسميع وطلابي',
    }
  }

  if (role !== 'teacher') {
    await sb.from('profiles').update({ role: 'teacher' }).eq('id', userId)
  }

  const code = String(profile.code || '').toUpperCase()
  const tcode = code.startsWith('T-') ? code : code ? `T-${code}` : null
  const name = String(profile.full_name || '').trim()

  const { data: candidates } = await sb
    .from('teachers')
    .select('id, code, name, profile_id, is_active, rate_percent')
    .is('profile_id', null)
    .limit(200)

  let match =
    (candidates || []).find((t) => tcode && t.code === tcode) ||
    (candidates || []).find((t) => name && t.name === name) ||
    null

  if (!match && name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const key = parts.slice(0, 2).join(' ')
      match = (candidates || []).find((t) => String(t.name || '').includes(key)) || null
    }
    if (!match && parts.length >= 1) {
      match = (candidates || []).find((t) => String(t.name || '').includes(parts[0])) || null
    }
  }

  if (!match && name) {
    const { data: byName } = await sb
      .from('teachers')
      .select('id, code, name, profile_id, is_active, rate_percent')
      .eq('name', name)
      .limit(3)
    if (byName && byName.length === 1) match = byName[0]
  }

  if (match) {
    await sb.from('teachers').update({ profile_id: userId, is_active: true }).eq('id', match.id)
    return {
      teacher: { ...match, profile_id: userId, is_active: true } as TeacherRow,
      linked: true,
      created: false,
      role: 'teacher',
      message: `تم ربط ملف المعلم: ${match.name}`,
    }
  }

  const newCode = tcode || `T-${userId.slice(0, 6).toUpperCase()}`
  const { data: created, error } = await sb
    .from('teachers')
    .insert({
      code: newCode,
      name: name || newCode,
      profile_id: userId,
      rate_percent: 50,
      is_active: true,
    })
    .select('id, code, name, profile_id, is_active, rate_percent')
    .single()

  if (error || !created) {
    return {
      teacher: null,
      linked: false,
      created: false,
      role: 'teacher',
      message: error?.message || 'فشل إنشاء ملف معلم',
    }
  }

  return {
    teacher: created as TeacherRow,
    linked: false,
    created: true,
    role: 'teacher',
    message: `تم إنشاء ملف معلم: ${created.name}`,
  }
}
